import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { z } from "zod";

// Helper to validate image URLs (accepts full URLs or relative paths like /uploads/...)
const imageUrlSchema = z.string().refine(
  (val) => !val || val.startsWith("/") || val.startsWith("http://") || val.startsWith("https://"),
  { message: "Invalid image URL" }
);

const updateRestaurantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  address: z.string().min(5, "Address must be at least 5 characters").optional(),
  city: z.string().min(2, "City must be at least 2 characters").optional(),
  pincode: z.string().min(6, "Pincode must be 6 digits").max(6, "Pincode must be 6 digits").optional(),
  restaurantImageUrl: imageUrlSchema.optional().or(z.literal("")),
  fssaiNumber: z.string().min(14, "FSSAI number must be 14 digits").max(14, "FSSAI number must be 14 digits").optional(),
  fssaiCertificateUrl: imageUrlSchema.optional().or(z.literal("")),
});

// GET - Fetch single restaurant by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    const restaurant = await db.restaurant.findFirst({
      where: {
        id,
        ownerId: session.id,
      },
      include: {
        categories: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: restaurant });
  } catch (error) {
    console.error("Get restaurant error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

// PATCH - Update restaurant details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    // Verify ownership
    const restaurant = await db.restaurant.findFirst({
      where: {
        id,
        ownerId: session.id,
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = updateRestaurantSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Build update data, only including fields that were provided
    const updateData: Record<string, unknown> = {};

    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name;
    }
    if (validation.data.address !== undefined) {
      updateData.address = validation.data.address;
    }
    if (validation.data.city !== undefined) {
      updateData.city = validation.data.city;
    }
    if (validation.data.pincode !== undefined) {
      updateData.pincode = validation.data.pincode || null;
    }
    if (validation.data.restaurantImageUrl !== undefined) {
      updateData.restaurantImageUrl = validation.data.restaurantImageUrl || null;
    }
    if (validation.data.fssaiNumber !== undefined) {
      updateData.fssaiNumber = validation.data.fssaiNumber || null;
    }
    if (validation.data.fssaiCertificateUrl !== undefined) {
      updateData.fssaiCertificateUrl = validation.data.fssaiCertificateUrl || null;
    }

    const updatedRestaurant = await db.restaurant.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ok: true, data: updatedRestaurant });
  } catch (error) {
    console.error("Update restaurant error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

// DELETE - Soft delete restaurant (only if no active bookings)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    // Verify ownership
    const restaurant = await db.restaurant.findFirst({
      where: {
        id,
        ownerId: session.id,
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Check for active bookings (not completed or cancelled)
    const activeBookings = await db.serviceBooking.count({
      where: {
        restaurantId: id,
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
    });

    if (activeBookings > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot delete restaurant with ${activeBookings} active booking(s). Please complete or cancel all bookings first.`
        },
        { status: 400 }
      );
    }

    // Check for active marketplace orders
    const activeOrders = await db.marketplaceOrder.count({
      where: {
        restaurantId: id,
        status: {
          notIn: ["DELIVERED", "CANCELLED"],
        },
      },
    });

    if (activeOrders > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot delete restaurant with ${activeOrders} active order(s). Please wait for orders to be delivered or cancel them first.`
        },
        { status: 400 }
      );
    }

    // Soft delete by updating status to REJECTED with a deletion reason
    // Or we can add a deletedAt field - for now, we'll just delete the restaurant
    // Since the schema doesn't have deletedAt on Restaurant, we'll do a hard delete
    // but this cascades to related records due to Prisma's onDelete settings

    await db.restaurant.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: "Restaurant deleted successfully"
    });
  } catch (error) {
    console.error("Delete restaurant error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
