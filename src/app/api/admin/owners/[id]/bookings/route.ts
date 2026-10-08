import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

// GET - All service bookings for one owner (Admin Owner 360° view)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const bookings = await db.serviceBooking.findMany({
      where: { ownerId: id },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        slotStartDateTime: true,
        slotEndDateTime: true,
        totalAmount: true,
        discountAmount: true,
        gstAmount: true,
        problemDescription: true,
        createdAt: true,
        restaurant: { select: { id: true, name: true, city: true } },
        equipment: { select: { id: true, name: true } },
        engineerAssignments: {
          select: {
            id: true,
            status: true,
            engineer: { select: { id: true, name: true } },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: bookings });
  } catch (error) {
    console.error("Get owner bookings error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
