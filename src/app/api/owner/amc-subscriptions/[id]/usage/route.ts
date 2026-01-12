import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { amcServiceUseSchema } from "@/server/validators/amc";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id } = await params;

    // Verify subscription ownership
    const subscription = await db.aMCSubscription.findFirst({
      where: {
        id,
        ownerId: session.id,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { ok: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const [usageLogs, total] = await Promise.all([
      db.aMCServiceUse.findMany({
        where: { subscriptionId: id },
        include: {
          booking: {
            select: {
              id: true,
              status: true,
              slotStartDateTime: true,
            },
          },
        },
        orderBy: { serviceDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.aMCServiceUse.count({ where: { subscriptionId: id } }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { usageLogs, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get AMC usage logs error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id } = await params;

    const body = await request.json();
    const validation = amcServiceUseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify subscription ownership and status
    const subscription = await db.aMCSubscription.findFirst({
      where: {
        id,
        ownerId: session.id,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { ok: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    if (subscription.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, error: "Subscription is not active" },
        { status: 400 }
      );
    }

    // Check if service limit has been reached
    if (subscription.servicesUsed >= subscription.serviceLimit) {
      return NextResponse.json(
        { ok: false, error: "Service limit reached for this subscription" },
        { status: 400 }
      );
    }

    // If bookingId is provided, verify it belongs to the owner
    if (validation.data.bookingId) {
      const booking = await db.serviceBooking.findFirst({
        where: {
          id: validation.data.bookingId,
          ownerId: session.id,
          restaurantId: subscription.restaurantId,
        },
      });

      if (!booking) {
        return NextResponse.json(
          { ok: false, error: "Booking not found or does not belong to this subscription's restaurant" },
          { status: 404 }
        );
      }
    }

    // Create usage log and increment services used in a transaction
    const [usageLog] = await db.$transaction([
      db.aMCServiceUse.create({
        data: {
          subscriptionId: id,
          bookingId: validation.data.bookingId || null,
          serviceDate: new Date(validation.data.serviceDate),
          serviceType: validation.data.serviceType,
          notes: validation.data.notes || null,
        },
      }),
      db.aMCSubscription.update({
        where: { id },
        data: {
          servicesUsed: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, data: usageLog });
  } catch (error) {
    console.error("Log AMC usage error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
