import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

// GET - Fetch owner details with their restaurants
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const owner = await db.user.findFirst({
      where: {
        id,
        role: "OWNER",
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        serviceDiscountPercent: true,
        ownerProfile: {
          select: { approvalStatus: true, rejectionReason: true, approvedAt: true },
        },
        restaurants: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            restaurants: true,
            serviceBookings: true,
            marketplaceOrders: true,
          },
        },
      },
    });

    if (!owner) {
      return NextResponse.json(
        { ok: false, error: "Owner not found" },
        { status: 404 }
      );
    }

    // Calculate quick stats
    const approvedRestaurants = owner.restaurants.filter(r => r.status === "APPROVED").length;
    const pendingRestaurants = owner.restaurants.filter(r => r.status === "PENDING").length;

    return NextResponse.json({
      ok: true,
      data: {
        ...owner,
        stats: {
          totalRestaurants: owner._count.restaurants,
          approvedRestaurants,
          pendingRestaurants,
          totalBookings: owner._count.serviceBookings,
          totalOrders: owner._count.marketplaceOrders,
        },
      },
    });
  } catch (error) {
    console.error("Get owner error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

// POST - Approve or reject a pending owner registration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { action, rejectionReason } = body;

    const owner = await db.user.findFirst({
      where: { id, role: "OWNER", deletedAt: null },
      include: { ownerProfile: true },
    });

    if (!owner) {
      return NextResponse.json({ ok: false, error: "Owner not found" }, { status: 404 });
    }

    if (!owner.ownerProfile) {
      return NextResponse.json({ ok: false, error: "Owner profile not found" }, { status: 404 });
    }

    if (action === "approve") {
      await db.ownerProfile.update({
        where: { userId: id },
        data: {
          approvalStatus: "APPROVED",
          approvedAt: new Date(),
          rejectionReason: null,
        },
      });

      await db.notification.create({
        data: {
          userId: id,
          title: "Registration Approved!",
          message: "Your owner registration has been approved. You can now log in and add your restaurant.",
          linkUrl: "/owner/restaurant/create",
        },
      });

      return NextResponse.json({ ok: true, message: "Owner approved successfully" });
    }

    if (action === "reject") {
      if (!rejectionReason || rejectionReason.trim().length < 10) {
        return NextResponse.json(
          { ok: false, error: "Rejection reason must be at least 10 characters" },
          { status: 400 }
        );
      }

      await db.ownerProfile.update({
        where: { userId: id },
        data: {
          approvalStatus: "REJECTED",
          rejectionReason: rejectionReason.trim(),
        },
      });

      await db.notification.create({
        data: {
          userId: id,
          title: "Registration Rejected",
          message: "Your owner registration was rejected. Reason: " + rejectionReason.trim(),
        },
      });

      return NextResponse.json({ ok: true, message: "Owner rejected successfully" });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid action. Use 'approve' or 'reject'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Update owner approval error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Permanently delete owner and all their data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const owner = await db.user.findFirst({
      where: { id, role: "OWNER", deletedAt: null },
      select: { id: true, name: true, email: true },
    });

    if (!owner) {
      return NextResponse.json(
        { ok: false, error: "Owner not found" },
        { status: 404 }
      );
    }

    // Hard delete — cascade will remove all related data
    await db.user.delete({ where: { id } });

    return NextResponse.json({
      ok: true,
      message: `Owner "${owner.name}" and all associated data permanently deleted.`,
    });
  } catch (error) {
    console.error("Delete owner error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to delete owner" },
      { status: 500 }
    );
  }
}

// PATCH - Toggle owner active status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const { isActive, serviceDiscountPercent } = body;

    if (isActive === undefined && serviceDiscountPercent === undefined) {
      return NextResponse.json(
        { ok: false, error: "Provide isActive and/or serviceDiscountPercent" },
        { status: 400 }
      );
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "isActive must be a boolean" },
        { status: 400 }
      );
    }

    if (
      serviceDiscountPercent !== undefined &&
      serviceDiscountPercent !== null &&
      (typeof serviceDiscountPercent !== "number" ||
        serviceDiscountPercent < 0 ||
        serviceDiscountPercent > 100)
    ) {
      return NextResponse.json(
        { ok: false, error: "serviceDiscountPercent must be a number between 0 and 100, or null to clear the override" },
        { status: 400 }
      );
    }

    // Verify the user exists and is an owner
    const existingOwner = await db.user.findFirst({
      where: {
        id,
        role: "OWNER",
        deletedAt: null,
      },
    });

    if (!existingOwner) {
      return NextResponse.json(
        { ok: false, error: "Owner not found" },
        { status: 404 }
      );
    }

    const updatedOwner = await db.user.update({
      where: { id },
      data: {
        ...(isActive !== undefined ? { isActive } : {}),
        ...(serviceDiscountPercent !== undefined ? { serviceDiscountPercent } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        serviceDiscountPercent: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: updatedOwner,
      message:
        isActive !== undefined
          ? isActive
            ? "Owner activated successfully"
            : "Owner deactivated successfully"
          : "Owner discount updated successfully",
    });
  } catch (error) {
    console.error("Update owner error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
