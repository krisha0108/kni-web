import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { z } from "zod";

const createOrderSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  vendorId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      qty: z.number().int().positive(),
    })
  ),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");
    const page = parseInt(searchParams.get("page") || "0", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access with marketplace:read permission
    await requireRestaurantAccess(session, restaurantId, "marketplace:read");

    const where = { restaurantId };

    const [orders, total] = await Promise.all([
      db.marketplaceOrder.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
        restaurant: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                deliveryTime: true,
                product: { select: { name: true, unit: true } },
              },
            },
          },
        },
        rating: { select: { id: true, overallRating: true, review: true } },
        statusHistory: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            oldStatus: true,
            newStatus: true,
            notes: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
        ...(page > 0 ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
    }),
      page > 0 ? db.marketplaceOrder.count({ where }) : Promise.resolve(-1),
    ]);

    // Resolve product names from MarketplaceProduct (VendorProduct.name is legacy/null)
    const resolved = orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        product: {
          id: item.product.id,
          name: item.product.product?.name || item.product.name || "Unknown Product",
          unit: item.product.product?.unit || item.product.unit || "pcs",
          deliveryTime: item.product.deliveryTime,
        },
      })),
    }));

    return NextResponse.json({
      ok: true,
      data: page > 0 ? { items: resolved, total, page, pageSize } : resolved,
    });
  } catch (error) {
    console.error("Get marketplace orders error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const body = await request.json();
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { restaurantId, vendorId, items, deliveryAddress, notes } = validation.data;

    // Check restaurant access with marketplace:create permission
    await requireRestaurantAccess(session, restaurantId, "marketplace:create");

    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId, status: "APPROVED" },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or not approved" },
        { status: 400 }
      );
    }

    // Check if vendor is system vendor (admin store) — skip location check
    const vendorProfile = await db.vendorProfile.findUnique({
      where: { userId: vendorId },
      select: { isSystemVendor: true },
    });

    if (!vendorProfile?.isSystemVendor) {
      // Verify vendor has approved location matching restaurant's city
      const vendorApprovedLocation = await db.vendorLocationRequest.findFirst({
        where: {
          vendorId,
          status: "APPROVED",
          area: {
            city: {
              name: restaurant.city,
            },
          },
        },
      });

      if (!vendorApprovedLocation) {
        return NextResponse.json(
          { ok: false, error: "Vendor is not approved to serve in your restaurant's city" },
          { status: 400 }
        );
      }
    }

    const products = await db.vendorProduct.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      include: {
        product: { select: { name: true } },
        vendor: {
          select: { vendorProfile: { select: { isSystemVendor: true } } },
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Fetch price unlocks for price-on-request products
    const priceOnRequestIds = products
      .filter((p) => p.priceOnRequest && p.vendor.vendorProfile?.isSystemVendor)
      .map((p) => p.id);

    let unlockMap = new Map<string, number>();
    if (priceOnRequestIds.length > 0) {
      const unlocks = await db.priceUnlockRequest.findMany({
        where: {
          ownerId: session.id,
          vendorProductId: { in: priceOnRequestIds },
          status: "UNLOCKED",
        },
        select: { vendorProductId: true, unlockedPrice: true, validUntil: true },
      });

      for (const u of unlocks) {
        if (u.validUntil && u.validUntil < new Date()) {
          const pName = productMap.get(u.vendorProductId)?.product?.name || "product";
          throw new Error(`Your price quote for "${pName}" has expired. Please request a new price.`);
        }
        if (u.unlockedPrice) {
          unlockMap.set(u.vendorProductId, u.unlockedPrice);
        }
      }
    }

    let totalAmount = 0;

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Product not found: " + item.productId);

      // Use unlocked price for price-on-request products
      let itemPrice = product.price;
      if (product.priceOnRequest && product.vendor.vendorProfile?.isSystemVendor) {
        const unlockedPrice = unlockMap.get(product.id);
        if (!unlockedPrice) {
          throw new Error(`Price not unlocked for "${product.product?.name || "product"}". Please request a price first.`);
        }
        itemPrice = unlockedPrice;
      }

      totalAmount += itemPrice * item.qty;
      return {
        vendorProductId: item.productId,
        qty: item.qty,
        priceSnapshot: itemPrice,
      };
    });

    // Use transaction to create order and vendor ledger entry atomically
    const ownerId = await getRestaurantOwnerId(restaurantId);
    const order = await db.$transaction(async (tx) => {
      // Check stock and decrement inside transaction (race-condition safe)
      for (const item of items) {
        const product = await tx.vendorProduct.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true, name: true, product: { select: { name: true } } },
        });
        if (!product || product.stockQuantity < item.qty) {
          const name = product?.product?.name || product?.name || "product";
          throw new Error(`Insufficient stock for "${name}". Available: ${product?.stockQuantity ?? 0}, Requested: ${item.qty}`);
        }
        await tx.vendorProduct.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.qty } },
        });
      }

      // Create the order
      const newOrder = await tx.marketplaceOrder.create({
        data: {
          ownerId,
          vendorId,
          restaurantId,
          status: "PLACED",
          totalAmount,
          deliveryAddress: deliveryAddress || null,
          notes: notes || null,
          items: { create: orderItems },
        },
        include: {
          vendor: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Get vendor details for ledger entry
      const vendor = await tx.user.findUnique({
        where: { id: vendorId },
        select: { name: true, phone: true },
      });

      // Get previous vendor ledger balance
      const previousEntries = await tx.vendorLedger.findMany({
        where: {
          restaurantId,
          vendorName: vendor?.name || "Unknown Vendor",
        },
        orderBy: {
          entryDate: "desc",
        },
        take: 1,
      });

      const previousBalance = previousEntries[0]?.balanceAfter || 0;
      const newBalance = previousBalance + totalAmount;

      // AUTO-SYNC: Create vendor ledger entry (PURCHASE increases balance owed to vendor)
      await tx.vendorLedger.create({
        data: {
          ownerId,
          restaurantId,
          vendorName: vendor?.name || "Unknown Vendor",
          vendorPhone: vendor?.phone || null,
          entryType: "PURCHASE",
          amount: totalAmount,
          description: `Marketplace order - ${newOrder.items.length} items`,
          billNumber: `MKT-${newOrder.id.substring(0, 8)}`,
          billDate: new Date(),
          balanceAfter: newBalance,
          entryDate: new Date(),
          createdBy: session.id,
        },
      });

      // AUTO-SYNC: Create Expense entry
      await tx.expense.create({
        data: {
          ownerId,
          restaurantId,
          category: "SUPPLIES",
          amount: totalAmount,
          expenseDate: new Date(),
          description: `Marketplace order - ${newOrder.items.length} items from ${vendor?.name}`,
        },
      });

      return newOrder;
    });

    return NextResponse.json({ ok: true, data: order });
  } catch (error) {
    console.error("Create marketplace order error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
