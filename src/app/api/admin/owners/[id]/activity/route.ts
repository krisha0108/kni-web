import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

type ActivityEntry = {
  id: string;
  type: string;
  label: string;
  restaurantName: string | null;
  date: Date;
};

// GET - A single chronological activity feed for one owner, built by merging
// timestamps/status-changes directly from the domain tables (not the generic
// AuditLog, which logs every admin action platform-wide and would be noisy).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const [restaurants, bookings, assignments, orders, orderHistory, amcRequests, amcContracts] =
      await Promise.all([
        db.restaurant.findMany({
          where: { ownerId: id },
          select: { id: true, name: true, status: true, createdAt: true },
        }),
        db.serviceBooking.findMany({
          where: { ownerId: id },
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            createdAt: true,
            restaurant: { select: { name: true } },
          },
        }),
        db.engineerAssignment.findMany({
          where: { booking: { ownerId: id } },
          select: {
            id: true,
            status: true,
            assignedAt: true,
            completedAt: true,
            engineer: { select: { name: true } },
            booking: { select: { bookingNumber: true, restaurant: { select: { name: true } } } },
          },
        }),
        db.marketplaceOrder.findMany({
          where: { ownerId: id },
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            restaurant: { select: { name: true } },
          },
        }),
        db.orderStatusHistory.findMany({
          where: { order: { ownerId: id } },
          select: {
            id: true,
            newStatus: true,
            createdAt: true,
            order: { select: { orderNumber: true, restaurant: { select: { name: true } } } },
          },
        }),
        db.aMCRequest.findMany({
          where: { ownerId: id },
          select: {
            id: true,
            status: true,
            contractCategory: true,
            createdAt: true,
            restaurant: { select: { name: true } },
          },
        }),
        db.aMCContract.findMany({
          where: { ownerId: id },
          select: {
            id: true,
            contractNumber: true,
            status: true,
            createdAt: true,
            restaurant: { select: { name: true } },
          },
        }),
      ]);

    const entries: ActivityEntry[] = [
      ...restaurants.map((r) => ({
        id: `restaurant-${r.id}`,
        type: "restaurant",
        label: `Restaurant "${r.name}" registered (${r.status})`,
        restaurantName: r.name,
        date: r.createdAt,
      })),
      ...bookings.map((b) => ({
        id: `booking-${b.id}`,
        type: "booking",
        label: `Booking ${b.bookingNumber ?? b.id} created (${b.status})`,
        restaurantName: b.restaurant.name,
        date: b.createdAt,
      })),
      ...assignments.map((a) => ({
        id: `assignment-${a.id}`,
        type: "service",
        label: `Engineer ${a.engineer.name} ${a.completedAt ? "completed" : "assigned to"} booking ${a.booking.bookingNumber ?? ""} (${a.status})`,
        restaurantName: a.booking.restaurant.name,
        date: a.completedAt ?? a.assignedAt,
      })),
      ...orders.map((o) => ({
        id: `order-${o.id}`,
        type: "order",
        label: `Order ${o.orderNumber ?? o.id} placed`,
        restaurantName: o.restaurant.name,
        date: o.createdAt,
      })),
      ...orderHistory.map((h) => ({
        id: `order-status-${h.id}`,
        type: "order",
        label: `Order ${h.order.orderNumber ?? ""} status changed to ${h.newStatus}`,
        restaurantName: h.order.restaurant.name,
        date: h.createdAt,
      })),
      ...amcRequests.map((r) => ({
        id: `amc-request-${r.id}`,
        type: "amc",
        label: `${r.contractCategory} request raised (${r.status})`,
        restaurantName: r.restaurant.name,
        date: r.createdAt,
      })),
      ...amcContracts.map((c) => ({
        id: `amc-contract-${c.id}`,
        type: "amc",
        label: `AMC contract ${c.contractNumber} ${c.status === "ACTIVE" ? "activated" : c.status.toLowerCase()}`,
        restaurantName: c.restaurant.name,
        date: c.createdAt,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ ok: true, data: entries });
  } catch (error) {
    console.error("Get owner activity error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
