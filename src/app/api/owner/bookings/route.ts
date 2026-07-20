import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { z } from "zod";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { createNotification, createNotificationForRole } from "@/server/notifications/service";
import { computeBookingTotal, computeCategorySubtotals } from "@/lib/booking-pricing";
import { getEffectiveDiscount } from "@/server/pricing/discount";

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
  // Only used for direct (non-cart) bookings - cart-based bookings read
  // Cart.promoCode instead (set via PATCH /api/owner/cart/promo-code).
  promoCode: z.string().trim().optional(),
  // Owner's explicit pick from the /api/owner/effective-discount `candidates`
  // list (offerId, "custom-rate", or null for "no discount"). Omit to keep
  // auto-best-offer behavior.
  offerId: z.string().nullable().optional(),
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

    // Check restaurant access with bookings:read permission
    await requireRestaurantAccess(session, restaurantId, "bookings:read");

    const where = { restaurantId };

    const [bookings, total] = await Promise.all([
      db.serviceBooking.findMany({
        where,
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
            include: { engineer: { select: { id: true, name: true, phone: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        ...(page > 0 ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      }),
      page > 0 ? db.serviceBooking.count({ where }) : Promise.resolve(-1),
    ]);

    return NextResponse.json({
      ok: true,
      data: page > 0 ? { items: bookings, total, page, pageSize } : bookings,
    });
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

    const { restaurantId, equipmentId, slotStartDateTime, slotEndDateTime, problemDescription, paymentScreenshotUrl, tip, items: directItems, promoCode: bodyPromoCode, offerId: selectedOfferId } = validation.data;

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

    const categoryAmounts: Array<{ categoryId: string; amount: number }> = [];

    if (directItems && directItems.length > 0) {
      // Direct item-based booking (from equipment request service)
      for (const item of directItems) {
        if (item.itemType === "SERVICE") {
          const serviceItem = await db.serviceItem.findUnique({
            where: { id: item.itemId },
            select: { id: true, name: true, price: true, categoryId: true },
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
          categoryAmounts.push({ categoryId: serviceItem.categoryId, amount: item.priceSnapshot * item.qty });
        } else {
          const partItem = await db.partItem.findUnique({
            where: { id: item.itemId },
            select: { id: true, name: true, price: true, categoryId: true },
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
          categoryAmounts.push({ categoryId: partItem.categoryId, amount: item.priceSnapshot * item.qty });
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
              serviceItem: { select: { name: true, categoryId: true } },
              partItem: { select: { name: true, categoryId: true } },
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
                serviceItem: { select: { name: true, categoryId: true } },
                partItem: { select: { name: true, categoryId: true } },
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

      for (const item of cart.items as any[]) {
        const categoryId = item.serviceItem?.categoryId || item.partItem?.categoryId;
        if (categoryId) categoryAmounts.push({ categoryId, amount: item.priceSnapshot * item.qty });
      }

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

    const ownerId = await getRestaurantOwnerId(restaurantId);
    const tipAmount = tip || 0;
    const categorySubtotals = computeCategorySubtotals(categoryAmounts);
    const promoCode = bodyPromoCode || cart?.promoCode || undefined;

    // Discount resolution + redemption-cap check + booking create + redemption
    // row all happen in one transaction, so a maxRedemptions/onePerOwner cap
    // can't be raced past by two concurrent bookings.
    const { booking, discountSource, discountAmount } = await db.$transaction(async (tx) => {
      const discount = await getEffectiveDiscount(
        { ownerId, restaurantId, totalAmount, categorySubtotals, promoCode, selectedOfferId },
        tx
      );

      if (promoCode && discount.promoCodeError) {
        throw Object.assign(new Error(discount.promoCodeError), { isClientError: true });
      }

      if (discount.selectedOfferInvalid) {
        throw Object.assign(
          new Error("The selected offer is no longer available. Please choose a different one."),
          { isClientError: true }
        );
      }

      const pricing = computeBookingTotal(totalAmount, discount.amount, tipAmount);

      const booking = await tx.serviceBooking.create({
        data: {
          ownerId,
          restaurantId,
          equipmentId: equipmentId || null,
          slotStartDateTime: new Date(slotStartDateTime),
          slotEndDateTime: slotEndDateTime
            ? new Date(slotEndDateTime)
            : null,
          status: paymentScreenshotUrl ? "PAYMENT_UPLOADED" : "SLOT_SELECTED",
          totalAmount: Math.round(pricing.totalAmount),
          discountPercent: pricing.discountPercent,
          discountAmount: pricing.discountAmount,
          discountSource: pricing.discountAmount > 0 ? discount.source : null,
          gstAmount: pricing.gstAmount,
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

      if (discount.offerId) {
        await tx.bookingOfferRedemption.create({
          data: { offerId: discount.offerId, ownerId, bookingId: booking.id },
        });
      }

      if (paymentScreenshotUrl) {
        await tx.paymentProof.create({
          data: {
            bookingId: booking.id,
            ownerId,
            screenshotUrl: paymentScreenshotUrl,
            status: "UPLOADED",
          },
        });
      }

      return { booking, discountSource: discount.source, discountAmount: pricing.discountAmount };
    });

    console.log("Created booking:", {
      ownerId,
      restaurantId,
      equipmentId: equipmentId || null,
      totalAmount: booking.totalAmount,
      itemsCount: bookingItems.length,
      discountAmount,
      discountSource: discountAmount > 0 ? discountSource : null,
    });

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
      booking.totalAmount,
      items
    ).catch((error) => {
      console.error("Failed to send booking confirmation email:", error);
    });

    // Notify admins about new booking
    createNotificationForRole(
      "ADMIN",
      "New Booking - Payment Pending",
      `${session.name} created a booking for ${restaurant.name}. Amount: ₹${booking.totalAmount.toLocaleString('en-IN')}`,
      "BOOKING",
      `/admin/bookings/${booking.id}`
    ).catch(console.error);

    // Confirm to owner
    createNotification({
      userId: session.id,
      title: "Booking Created",
      message: `Your booking for ${restaurant.name} has been created. Please upload payment proof.`,
      type: "BOOKING",
      linkUrl: `/owner/bookings/${booking.id}`,
      data: { type: "booking", bookingId: booking.id },
    }).catch(console.error);

    return NextResponse.json({ ok: true, data: booking });
  } catch (error) {
    console.error("Create booking error:", error);
    if (error instanceof Error && "isClientError" in error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    // Return more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const errorDetails = error instanceof Error && 'code' in error ? (error as Record<string, unknown>).code : undefined;
    console.error("Error details:", { message: errorMessage, code: errorDetails, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { ok: false, error: errorMessage, code: errorDetails },
      { status: 500 }
    );
  }
}
