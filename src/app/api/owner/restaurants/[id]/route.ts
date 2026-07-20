import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { assertRestaurantDeletable, RestaurantNotDeletableError } from "@/server/restaurants/deletion";
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
  // The edit form always sends every field (populated from the current
  // record, defaulting missing values to ""), so an optional field whose
  // saved value is empty/null must accept "" too - otherwise re-submitting
  // the form to change an unrelated field (e.g. address) fails validation
  // on a field the user never touched.
  pincode: z.string().min(6, "Pincode must be 6 digits").max(6, "Pincode must be 6 digits").optional().or(z.literal("")),
  outletType: z.string().optional().or(z.literal("")),
  restaurantImageUrl: imageUrlSchema.optional().or(z.literal("")),
  fssaiNumber: z.string().min(14, "FSSAI number must be 14 digits").max(14, "FSSAI number must be 14 digits").optional().or(z.literal("")),
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

    const access = await requireRestaurantAccess(session, id, "restaurant:read");

    const restaurant = await db.restaurant.findUnique({
      where: { id },
      include: {
        categories: {
          include: { category: { select: { id: true, name: true } } },
        },
        deletionRequests: {
          where: { status: "PENDING" },
          take: 1,
          select: { id: true, reason: true, createdAt: true },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const { deletionRequests, ...restaurantFields } = restaurant;
    return NextResponse.json({
      ok: true,
      data: {
        ...restaurantFields,
        userRole: access.role,
        pendingDeletionRequest: deletionRequests[0] ?? null,
      },
    });
  } catch (error) {
    console.error("Get restaurant error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : error instanceof Error && error.message.includes("not found") ? 404 : 500 }
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

    await requireRestaurantAccess(session, id, "restaurant:update");

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
    if (validation.data.outletType !== undefined) {
      updateData.outletType = validation.data.outletType || null;
    }

    // Editing a rejected restaurant resubmits it for admin review, rather than
    // leaving it stuck REJECTED forever with no path back into the queue.
    const existing = await db.restaurant.findUnique({ where: { id }, select: { status: true } });
    if (existing?.status === "REJECTED") {
      updateData.status = "PENDING";
      updateData.rejectionReason = null;
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
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : error instanceof Error && error.message.includes("not found") ? 404 : 500 }
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

    await requireRestaurantAccess(session, id, "restaurant:delete");

    const restaurant = await db.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      return NextResponse.json({ ok: false, error: "Restaurant not found" }, { status: 404 });
    }

    // Approved (live) restaurants carry real business data - they can only be
    // deleted through the admin-approved deletion-request flow.
    if (restaurant.status === "APPROVED") {
      return NextResponse.json(
        {
          ok: false,
          error: "Approved restaurants require admin approval to delete. Submit a deletion request instead.",
          code: "RESTAURANT_DELETE_REQUIRES_APPROVAL",
        },
        { status: 400 }
      );
    }

    await assertRestaurantDeletable(id);

    // Restaurant has no deletedAt field - hard delete, cascades to related
    // records via Prisma's onDelete settings.
    await db.restaurant.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: "Restaurant deleted successfully"
    });
  } catch (error) {
    console.error("Delete restaurant error:", error);
    if (error instanceof RestaurantNotDeletableError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : error instanceof Error && error.message.includes("not found") ? 404 : 500 }
    );
  }
}
