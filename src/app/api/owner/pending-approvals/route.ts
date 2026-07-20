import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { getUserRestaurants } from "@/server/auth/restaurant-rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");

    const items: any[] = [];

    try {
      // Check for pending restaurant approvals (owner-only: only show restaurants user owns)
      const pendingRestaurants = await db.restaurant.findMany({
        where: {
          ownerId: session.id,
          status: "PENDING",
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          status: true,
        },
      });

      pendingRestaurants.forEach((restaurant) => {
        items.push({
          id: `restaurant-${restaurant.id}`,
          type: "RESTAURANT",
          title: "Restaurant Registration",
          description: `Your restaurant '${restaurant.name}' is pending approval`,
          status: "PENDING",
          createdAt: restaurant.createdAt.toISOString(),
          metadata: { restaurantName: restaurant.name },
        });
      });

      // Get all restaurants accessible by this user for team invite + booking queries
      const userRestaurants = await getUserRestaurants(session.id);
      const accessibleRestaurantIds = restaurantId
        ? [restaurantId]
        : userRestaurants.map((r) => r.restaurantId);

      // Check for pending team invitations (filtered by restaurantId)
      // Only show for restaurants user owns (team invite management is owner-only)
      const ownedRestaurantIds = userRestaurants
        .filter((r) => r.role === "OWNER")
        .map((r) => r.restaurantId);

      const inviteRestaurantIds = restaurantId
        ? ownedRestaurantIds.includes(restaurantId) ? [restaurantId] : []
        : ownedRestaurantIds;

      if (inviteRestaurantIds.length > 0) {
        const pendingInvites = await db.restaurantMember.findMany({
          where: {
            restaurantId: { in: inviteRestaurantIds },
            acceptedAt: null,
          },
          include: {
            user: { select: { email: true } },
            restaurant: { select: { name: true } },
          },
        });

        pendingInvites.forEach((invite) => {
          items.push({
            id: `invite-${invite.id}`,
            type: "TEAM_INVITE",
            title: "Team Invitation Sent",
            description: `Waiting for ${invite.user?.email || 'member'} to accept invitation to ${invite.restaurant?.name}`,
            status: "PENDING",
            createdAt: invite.createdAt?.toISOString() || new Date().toISOString(),
            metadata: { memberEmail: invite.user?.email },
          });
        });
      }

      // Check for pending bookings requiring payment (filtered by restaurantId)
      if (restaurantId && accessibleRestaurantIds.includes(restaurantId)) {
        const pendingBookings = await db.serviceBooking.findMany({
          where: {
            restaurantId,
            status: "SLOT_SELECTED",
          },
          select: {
            id: true,
            createdAt: true,
            totalAmount: true,
          },
        });

        pendingBookings.forEach((booking) => {
          items.push({
            id: `booking-${booking.id}`,
            type: "BOOKING",
            title: "Payment Required",
            description: `Booking requires payment of ₹${(booking.totalAmount || 0).toLocaleString()}`,
            status: "PENDING",
            createdAt: booking.createdAt.toISOString(),
            metadata: { bookingId: booking.id },
          });
        });
      }

      // Check for pending category requests (across accessible restaurants)
      const pendingCategories = await db.categoryRequest.findMany({
        where: {
          restaurantId: restaurantId
            ? restaurantId
            : { in: accessibleRestaurantIds },
          status: "PENDING",
        },
        select: {
          id: true,
          requestedName: true,
          createdAt: true,
        },
      });

      pendingCategories.forEach((cat) => {
        items.push({
          id: `category-${cat.id}`,
          type: "CATEGORY_REQUEST",
          title: "Category Request",
          description: `Your request for category '${cat.requestedName}' is being reviewed`,
          status: "PENDING",
          createdAt: cat.createdAt?.toISOString() || new Date().toISOString(),
        });
      });

      // Check for pending restaurant deletion requests (across accessible restaurants)
      const pendingDeletions = await db.restaurantDeletionRequest.findMany({
        where: {
          restaurantId: restaurantId
            ? restaurantId
            : { in: accessibleRestaurantIds },
          status: "PENDING",
        },
        select: {
          id: true,
          restaurantName: true,
          createdAt: true,
        },
      });

      pendingDeletions.forEach((del) => {
        items.push({
          id: `deletion-${del.id}`,
          type: "RESTAURANT_DELETION",
          title: "Restaurant Deletion Request",
          description: `Your deletion request for '${del.restaurantName}' is awaiting admin approval`,
          status: "PENDING",
          createdAt: del.createdAt?.toISOString() || new Date().toISOString(),
          metadata: { restaurantName: del.restaurantName },
        });
      });

      return NextResponse.json({ ok: true, data: items });
    } catch (dbError) {
      console.error("Database error in pending-approvals:", dbError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch pending approvals" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Unauthorized")) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching pending approvals:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch pending approvals" }, { status: 500 });
  }
}
