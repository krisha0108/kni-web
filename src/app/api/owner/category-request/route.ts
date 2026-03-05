import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { createNotificationForRole } from "@/server/notifications/service";
import { Role, NotificationType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const body = await request.json();
    const { categoryName, description, reason, restaurantId } = body;

    if (!categoryName || !categoryName.trim()) {
      return NextResponse.json(
        { ok: false, error: "Category name is required" },
        { status: 400 }
      );
    }

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    // Check restaurant access with category:create permission
    await requireRestaurantAccess(session, restaurantId, "category:create");

    // Get the actual restaurant owner ID for the FK
    const ownerId = await getRestaurantOwnerId(restaurantId);

    // Create category request
    const categoryRequest = await db.categoryRequest.create({
      data: {
        ownerId,
        restaurantId,
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
    const session = await requireOwnerMobile(request);

    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access with category:read permission
    await requireRestaurantAccess(session, restaurantId, "category:read");

    const categoryRequests = await db.categoryRequest.findMany({
      where: {
        restaurantId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ ok: true, data: categoryRequests });
  } catch (error) {
    console.error("Get category requests error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Access denied") ? 403 : 500 }
    );
  }
}
