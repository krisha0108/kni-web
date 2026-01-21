import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    const booking = await db.serviceBooking.findFirst({
      where: {
        id,
        ownerId: session.id,
      },
      include: {
        restaurant: {
          select: { id: true, name: true, address: true, city: true },
        },
        items: {
          include: {
            serviceItem: { select: { id: true, name: true } },
            partItem: { select: { id: true, name: true } },
          },
        },
        paymentProof: true,
        engineerAssignments: {
          include: {
            engineer: { select: { id: true, name: true, phone: true } },
            workLog: true,
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: booking });
  } catch (error) {
    console.error("Get booking error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
