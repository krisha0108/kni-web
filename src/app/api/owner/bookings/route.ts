import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { z } from "zod";
import { sendBookingConfirmationEmail } from "@/lib/email";

const itemSchema = z.object({
  itemType: z.enum(["SERVICE", "PART"]),
  itemId: z.string(),
  qty: z.number().int().positive(),
  priceSnapshot: z.number(),
});

const createBookingSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  equipmentId: z.string().optional(),
  slotStartDateTime: z.string(),
  slotEndDateTime: z.string().optional(),
  problemDescription: z.string().optional(),
  paymentScreenshotUrl: z.string().optional(),
  tip: z.number().optional(),
  // Optional items array for direct booking (without cart)
  items: z.array(itemSchema).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);
    const restaurantId = request.nextUrl.searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access with bookings:read permission
    await requireRestaurantAccess(session, restaurantId, "bookings:read");

    const bookings = await db.serviceBooking.findMany({
      where: { restaurantId },
      include: {
        restaurant: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
        items: {
          include: {
            serviceItem: { select: { id: true, name: true } },
            partItem: { select: { id: true, name: true } },
          },
        },
        paymentProof: true,
        engineerAssignments: {
          include: { engineer: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: bookings });
  } catch (error) {
    console.error("Get bookings error:", error);
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
    const validation = createBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { restaurantId, equipmentId, slotStartDateTime, slotEndDateTime, problemDescription, paymentScreenshotUrl, tip, items: directItems } = validation.data;

    // Check restaurant access with bookings:create permission
    await requireRestaurantAccess(session, restaurantId, "bookings:create");

    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId, status: "APPROVED" },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or not approved" },
        { status: 400 }
      );
    }

    // Validate equipmentId if provided
    if (equipmentId) {
      const equipment = await db.equipment.findUnique({
        where: { id: equipmentId },
      });
      if (!equipment) {
        return NextResponse.json(
          { ok: false, error: "Equipment not found" },
          { status: 400 }
        );
      }
    }

    // Determine if using direct items or cart-based booking
    let bookingItems: Array<{
      itemType: "SERVICE" | "PART";
      serviceItemId: string | null;
      partItemId: string | null;
      qty: number;
      priceSnapshot: number;
      itemName?: string;
    }> = [];
    let totalAmount = 0;
    let cart: any = null;

    if (directItems && directItems.length > 0) {
      // Direct item-based booking (from equipment request service)
      for (const item of directItems) {
        if (item.itemType === "SERVICE") {
          const serviceItem = await db.serviceItem.findUnique({
            where: { id: item.itemId },
            select: { id: true, name: true, price: true },
          });
          if (!serviceItem) {
            return NextResponse.json(
              { ok: false, error: `Service item not found: ${item.itemId}` },
              { status: 400 }
            );
          }
          bookingItems.push({
            itemType: "SERVICE",
            serviceItemId: serviceItem.id,
            partItemId: null,
            qty: item.qty,
            priceSnapshot: item.priceSnapshot,
            itemName: serviceItem.name,
          });
        } else {
          const partItem = await db.partItem.findUnique({
            where: { id: item.itemId },
            select: { id: true, name: true, price: true },
          });
          if (!partItem) {
            return NextResponse.json(
              { ok: false, error: `Part item not found: ${item.itemId}` },
              { status: 400 }
            );
          }
          bookingItems.push({
            itemType: "PART",
            serviceItemId: null,
            partItemId: partItem.id,
            qty: item.qty,
            priceSnapshot: item.priceSnapshot,
            itemName: partItem.name,
          });
        }
        totalAmount += item.priceSnapshot * item.qty;
      }
    } else {
      // Cart-based booking (existing flow)
      // Find any DRAFT cart for this owner (may be associated with different restaurant)
      cart = await db.cart.findFirst({
        where: { ownerId: session.id, restaurantId, status: "DRAFT" },
        include: {
          items: {
            include: {
              serviceItem: { select: { name: true } },
              partItem: { select: { name: true } },
            },
          },
        },
      });

      // If no cart found for selected restaurant, try finding any DRAFT cart
      if (!cart || cart.items.length === 0) {
        cart = await db.cart.findFirst({
          where: { ownerId: session.id, status: "DRAFT" },
          include: {
            items: {
              include: {
                serviceItem: { select: { name: true } },
                partItem: { select: { name: true } },
              },
            },
          },
        });

        // Update cart's restaurantId to match selected restaurant
        if (cart && cart.items.length > 0) {
          await db.cart.update({
            where: { id: cart.id },
            data: { restaurantId },
          });
        }
      }

      if (!cart || cart.items.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Cart is empty. Please add items or provide items directly." },
          { status: 400 }
        );
      }

      bookingItems = cart.items.map((item: any) => ({
        itemType: item.itemType,
        serviceItemId: item.serviceItemId,
        partItemId: item.partItemId,
        qty: item.qty,
        priceSnapshot: item.priceSnapshot,
        itemName: item.serviceItem?.name || item.partItem?.name,
      }));

      totalAmount = cart.items.reduce((sum: number, item: any) => sum + item.priceSnapshot * item.qty, 0);
    }

    // Clean up old carts for this restaurant to avoid unique constraint issues
    // Delete ARCHIVED and SUBMITTED carts for this restaurant
    await db.cart.deleteMany({
      where: {
        ownerId: session.id,
        restaurantId,
        status: { in: ["ARCHIVED", "SUBMITTED"] },
      },
    });

    // Calculate GST (18%) and total with tip
    const GST_RATE = 0.18;
    const gstAmount = Math.round(totalAmount * GST_RATE);
    const tipAmount = tip || 0;
    const finalAmount = totalAmount + gstAmount + tipAmount;

    const ownerId = await getRestaurantOwnerId(restaurantId);

    console.log("Creating booking with data:", {
      ownerId,
      restaurantId,
      equipmentId: equipmentId || null,
      totalAmount: Math.round(finalAmount),
      itemsCount: bookingItems.length,
      bookingItems: bookingItems.map(i => ({
        itemType: i.itemType,
        serviceItemId: i.serviceItemId,
        partItemId: i.partItemId
      })),
    });

    const booking = await db.serviceBooking.create({
      data: {
        ownerId,
        restaurantId,
        equipmentId: equipmentId || null,
        slotStartDateTime: new Date(slotStartDateTime),
        slotEndDateTime: slotEndDateTime
          ? new Date(slotEndDateTime)
          : null,
        status: paymentScreenshotUrl ? "PAYMENT_UPLOADED" : "SLOT_SELECTED",
        totalAmount: Math.round(finalAmount),
        gstAmount: gstAmount,
        tipAmount: tipAmount,
        problemDescription: problemDescription || null,
        items: {
          create: bookingItems.map((item) => ({
            itemType: item.itemType,
            serviceItemId: item.serviceItemId,
            partItemId: item.partItemId,
            qty: item.qty,
            priceSnapshot: Math.round(item.priceSnapshot),
          })),
        },
      },
    });

    // Create payment proof if screenshot provided
    if (paymentScreenshotUrl) {
      await db.paymentProof.create({
        data: {
          bookingId: booking.id,
          ownerId,
          screenshotUrl: paymentScreenshotUrl,
          status: "UPLOADED",
        },
      });
    }

    // Clear all carts for this owner after booking
    // Due to unique constraint [ownerId, restaurantId, status], we need to delete old carts first
    // Delete ARCHIVED carts
    await db.cart.deleteMany({
      where: { ownerId: session.id, status: "ARCHIVED" },
    });

    // Delete SUBMITTED carts (they're already processed)
    await db.cart.deleteMany({
      where: { ownerId: session.id, status: "SUBMITTED" },
    });

    // Get all DRAFT carts and delete their items, then delete the carts
    const draftCarts = await db.cart.findMany({
      where: { ownerId: session.id, status: "DRAFT" },
      select: { id: true },
    });

    for (const draftCart of draftCarts) {
      await db.cartItem.deleteMany({ where: { cartId: draftCart.id } });
    }

    // Delete DRAFT carts instead of changing status (avoids unique constraint issues)
    await db.cart.deleteMany({
      where: { ownerId: session.id, status: "DRAFT" },
    });

    // Send booking confirmation email (non-blocking)
    const items = bookingItems.map((item) => ({
      name: item.itemName || "Unknown Item",
      quantity: item.qty,
    }));

    sendBookingConfirmationEmail(
      session.email,
      session.name,
      booking.id,
      restaurant.name,
      finalAmount,
      items
    ).catch((error) => {
      console.error("Failed to send booking confirmation email:", error);
    });

    return NextResponse.json({ ok: true, data: booking });
  } catch (error) {
    console.error("Create booking error:", error);
    // Return more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const errorDetails = error instanceof Error && 'code' in error ? (error as any).code : undefined;
    console.error("Error details:", { message: errorMessage, code: errorDetails, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { ok: false, error: errorMessage, code: errorDetails },
      { status: 500 }
    );
  }
}
