import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const categoryRequest = await db.categoryRequest.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
      },
    });

    if (!categoryRequest) {
      return NextResponse.json(
        { ok: false, error: "Category request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: categoryRequest });
  } catch (error) {
    console.error("Get category request error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const { action, rejectionReason } = body;

    const categoryRequest = await db.categoryRequest.findUnique({
      where: { id },
      include: {
        owner: true,
      },
    });

    if (!categoryRequest) {
      return NextResponse.json(
        { ok: false, error: "Category request not found" },
        { status: 404 }
      );
    }

    if (categoryRequest.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: "This request has already been processed" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Check if category already exists (MySQL is case-insensitive by default)
      const existingCategory = await db.category.findFirst({
        where: {
          name: categoryRequest.requestedName,
        },
      });

      if (existingCategory) {
        return NextResponse.json(
          { ok: false, error: "A category with this name already exists" },
          { status: 400 }
        );
      }

      // Create the category
      const newCategory = await db.category.create({
        data: {
          name: categoryRequest.requestedName,
          isActive: true,
        },
      });

      // Update request status
      await db.categoryRequest.update({
        where: { id },
        data: { status: "APPROVED" },
      });

      // Notify owner
      await createNotification({
        userId: categoryRequest.ownerId,
        title: "Category Request Approved",
        message: `Your category request "${categoryRequest.requestedName}" has been approved and is now available.`,
        linkUrl: "/owner/category",
      });

      return NextResponse.json({
        ok: true,
        message: "Category request approved and category created",
        data: { categoryRequest, category: newCategory },
      });
    } else if (action === "reject") {
      if (!rejectionReason || !rejectionReason.trim()) {
        return NextResponse.json(
          { ok: false, error: "Rejection reason is required" },
          { status: 400 }
        );
      }

      // Update request status
      await db.categoryRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason.trim(),
        },
      });

      // Notify owner
      await createNotification({
        userId: categoryRequest.ownerId,
        title: "Category Request Rejected",
        message: `Your category request "${categoryRequest.requestedName}" was rejected. Reason: ${rejectionReason}`,
        linkUrl: "/owner/category-request",
      });

      return NextResponse.json({
        ok: true,
        message: "Category request rejected",
      });
    } else {
      return NextResponse.json(
        { ok: false, error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Update category request error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
