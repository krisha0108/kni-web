import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { db } from "@/server/db";
import { createEngineerRating } from "@/server/ratings/service";
import { z } from "zod";

const engineerRatingSchema = z.object({
  assignmentId: z.string(),
  overallRating: z.number().min(1).max(5),
  professionalism: z.number().min(1).max(5).optional(),
  technicalSkill: z.number().min(1).max(5).optional(),
  communication: z.number().min(1).max(5).optional(),
  punctuality: z.number().min(1).max(5).optional(),
  problemSolving: z.number().min(1).max(5).optional(),
  review: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id: bookingId } = await params;

    // Fetch booking by id to get restaurantId for RBAC
    const booking = await db.serviceBooking.findUnique({
      where: { id: bookingId },
      select: {
        restaurantId: true,
        status: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          ok: false,
          error: "Booking not found",
        },
        { status: 404 }
      );
    }

    // RBAC check - verify user has access to update bookings for this restaurant
    await requireRestaurantAccess(session, booking.restaurantId, "bookings:update");

    if (booking.status !== "COMPLETED") {
      return NextResponse.json(
        {
          ok: false,
          error: "Can only rate completed bookings",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = engineerRatingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid input",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { assignmentId, ...ratingData } = validation.data;

    // Verify assignment exists and belongs to this booking
    const assignment = await db.engineerAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        bookingId: true,
        engineerId: true,
        status: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        {
          ok: false,
          error: "Assignment not found",
        },
        { status: 404 }
      );
    }

    if (assignment.bookingId !== bookingId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Assignment does not belong to this booking",
        },
        { status: 400 }
      );
    }

    if (assignment.status !== "COMPLETED") {
      return NextResponse.json(
        {
          ok: false,
          error: "Can only rate completed assignments",
        },
        { status: 400 }
      );
    }

    // Use actual restaurant owner ID for the rating record FK
    const actualOwnerId = await getRestaurantOwnerId(booking.restaurantId);

    const rating = await createEngineerRating({
      assignmentId,
      engineerId: assignment.engineerId,
      ownerId: actualOwnerId,
      restaurantId: booking.restaurantId,
      bookingId,
      ...ratingData,
    });

    return NextResponse.json({
      ok: true,
      message: "Rating submitted successfully",
      data: rating,
    });
  } catch (error: any) {
    console.error("Engineer rating error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

// GET - Fetch ratings for a booking's assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id: bookingId } = await params;

    // Fetch booking by id to get restaurantId for RBAC
    const bookingCheck = await db.serviceBooking.findUnique({
      where: { id: bookingId },
      select: { restaurantId: true },
    });

    if (!bookingCheck) {
      return NextResponse.json(
        {
          ok: false,
          error: "Booking not found",
        },
        { status: 404 }
      );
    }

    // RBAC check - verify user has access to read bookings for this restaurant
    await requireRestaurantAccess(session, bookingCheck.restaurantId, "bookings:read");

    const booking = await db.serviceBooking.findUnique({
      where: { id: bookingId },
      select: {
        engineerAssignments: {
          where: { status: "COMPLETED" },
          select: {
            id: true,
            engineerId: true,
            engineer: {
              select: {
                id: true,
                name: true,
              },
            },
            rating: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: booking?.engineerAssignments ?? [],
    });
  } catch (error: any) {
    console.error("Fetch engineer ratings error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
