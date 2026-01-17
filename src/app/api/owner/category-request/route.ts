import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { createNotificationForRole } from "@/server/notifications/service";
import { Role, NotificationType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();

    const body = await request.json();
    const { categoryName, description, reason } = body;

    if (!categoryName || !categoryName.trim()) {
      return NextResponse.json(
        { ok: false, error: "Category name is required" },
        { status: 400 }
      );
    }

    // Get owner's restaurant
    const restaurant = await db.restaurant.findFirst({
      where: {
        ownerId: session.id,
        status: "APPROVED",
      },
    });

    // Create category request
    const categoryRequest = await db.categoryRequest.create({
      data: {
        ownerId: session.id,
        restaurantId: restaurant?.id || null,
        requestedName: categoryName.trim(),
        description: description?.trim() || null,
        reason: reason?.trim() || null,
        status: "PENDING",
      },
    });

    // Notify all admins
    await createNotificationForRole(
      Role.ADMIN,
      "New Category Request",
      `${session.name} has requested a new category: "${categoryName}"`,
      NotificationType.SYSTEM,
      "/admin/category-requests"
    );

    return NextResponse.json({ ok: true, data: categoryRequest });
  } catch (error) {
    console.error("Create category request error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwner();

    const categoryRequests = await db.categoryRequest.findMany({
      where: {
        ownerId: session.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ ok: true, data: categoryRequests });
  } catch (error) {
    console.error("Get category requests error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
