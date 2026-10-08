import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

// GET - Every engineer service visit for one owner, merged from both sources:
// one-time ServiceBooking engineer assignments AND AMC contract scheduled visits.
// Same underlying rows also appear nested under their own booking/contract elsewhere
// (Bookings tab, AMC/CAMC tab) - this is just a unified chronological view.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const [bookingVisits, amcVisits] = await Promise.all([
      db.engineerAssignment.findMany({
        where: { booking: { ownerId: id } },
        select: {
          id: true,
          status: true,
          assignedAt: true,
          respondedAt: true,
          completedAt: true,
          engineer: { select: { id: true, name: true } },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              restaurant: { select: { id: true, name: true } },
            },
          },
          workLog: {
            select: { completionNote: true, workNotes: true, completedAt: true },
          },
        },
        orderBy: { assignedAt: "desc" },
      }),
      db.aMCScheduledVisit.findMany({
        where: { contract: { ownerId: id } },
        select: {
          id: true,
          visitNumber: true,
          visitType: true,
          status: true,
          scheduledDate: true,
          completedDate: true,
          workNotes: true,
          engineer: { select: { id: true, name: true } },
          contract: {
            select: {
              id: true,
              contractNumber: true,
              restaurant: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { scheduledDate: "desc" },
      }),
    ]);

    const merged = [
      ...bookingVisits.map((v) => ({
        source: "booking" as const,
        id: v.id,
        reference: v.booking.bookingNumber,
        restaurantName: v.booking.restaurant.name,
        engineer: v.engineer,
        status: v.status,
        date: v.completedAt ?? v.respondedAt ?? v.assignedAt,
        notes: v.workLog?.completionNote ?? v.workLog?.workNotes ?? null,
      })),
      ...amcVisits.map((v) => ({
        source: "amc" as const,
        id: v.id,
        reference: `${v.contract.contractNumber} · Visit #${v.visitNumber} (${v.visitType})`,
        restaurantName: v.contract.restaurant.name,
        engineer: v.engineer,
        status: v.status,
        date: v.completedDate ?? v.scheduledDate,
        notes: v.workNotes,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ ok: true, data: merged });
  } catch (error) {
    console.error("Get owner services error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
