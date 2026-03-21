import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { stockMovementSchema } from "@/server/validators/warehouse";
import { calculateNewBalance } from "@/lib/warehouse";
import { StockMovementType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const inventoryId = searchParams.get("inventoryId");
    const movementType = searchParams.get("movementType");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    const where: any = {
      ...(inventoryId ? { inventoryId } : {}),
      ...(movementType ? { movementType: movementType as StockMovementType } : {}),
    };

    const [movements, total] = await Promise.all([
      db.stockMovement.findMany({
        where,
        include: {
          inventory: {
            select: {
              id: true,
              partItem: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          booking: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.stockMovement.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { movements, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get stock movements error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await request.json();
    const validation = stockMovementSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if inventory exists
    const inventory = await db.warehouseInventory.findUnique({
      where: { id: validation.data.inventoryId },
    });

    if (!inventory) {
      return NextResponse.json(
        { ok: false, error: "Inventory not found" },
        { status: 404 }
      );
    }

    // Calculate new balance
    const newBalance = calculateNewBalance(
      inventory.currentStock,
      validation.data.movementType as StockMovementType,
      validation.data.quantity
    );

    // If bookingId is provided, verify it exists
    if (validation.data.bookingId) {
      const booking = await db.serviceBooking.findUnique({
        where: { id: validation.data.bookingId },
      });

      if (!booking) {
        return NextResponse.json(
          { ok: false, error: "Booking not found" },
          { status: 404 }
        );
      }
    }

    // Create stock movement and update inventory in a transaction
    const [movement, updatedInventory] = await db.$transaction([
      db.stockMovement.create({
        data: {
          inventoryId: validation.data.inventoryId,
          movementType: validation.data.movementType as StockMovementType,
          quantity: validation.data.quantity,
          balanceAfter: newBalance,
          bookingId: validation.data.bookingId || null,
          notes: validation.data.notes || null,
          createdBy: session.id,
        },
        include: {
          inventory: {
            select: {
              id: true,
              partItem: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      db.warehouseInventory.update({
        where: { id: validation.data.inventoryId },
        data: {
          currentStock: newBalance,
          lastRestockedAt:
            validation.data.movementType === "INWARD_PURCHASE" ||
            validation.data.movementType === "INWARD_RETURN"
              ? new Date()
              : inventory.lastRestockedAt,
        },
      }),
    ]);

    // Check if stock is now low and create notification
    if (updatedInventory.currentStock < updatedInventory.lowStockThreshold) {
      // Get all admin users for notification
      const admins = await db.user.findMany({
        where: { role: "ADMIN", isActive: true },
        select: { id: true },
      });

      // Create notification for each admin
      await Promise.all(
        admins.map((admin) =>
          db.notification.create({
            data: {
              userId: admin.id,
              title: "Low Stock Alert",
              message: `Stock for ${movement.inventory.partItem.name} is running low (${updatedInventory.currentStock} units remaining)`,
              linkUrl: `/admin/warehouse/inventory/${updatedInventory.id}`,
            },
          })
        )
      );
    }

    return NextResponse.json({ ok: true, data: movement });
  } catch (error) {
    console.error("Create stock movement error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
