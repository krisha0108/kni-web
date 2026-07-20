import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";

/**
 * GET /api/restaurant-owner/reports/spending-summary
 * Fetch spending summary and reports for owner
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;

    // Build date filters
    let startDate: Date;
    let endDate: Date;

    if (month) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    // Only count bookings where payment has actually been verified — DRAFT,
    // SLOT_SELECTED, PAYMENT_UPLOADED (not yet verified), PAYMENT_REJECTED, and
    // CANCELLED bookings never had money change hands and must not be counted
    // as "spending" (mirrors the COMPLETED-only filter used by the web
    // finance-reports endpoint's equipment-expense calculation).
    const PAID_BOOKING_STATUSES = [
      "PAYMENT_VERIFIED",
      "ENGINEER_ASSIGNED",
      "ACCEPTED_BY_ENGINEER",
      "IN_PROGRESS",
      "REJECTED_BY_ENGINEER",
      "COMPLETED",
    ] as const;

    // Fetch all paid bookings for the period
    const bookings = await db.serviceBooking.findMany({
      where: {
        ownerId: session.id,
        status: { in: [...PAID_BOOKING_STATUSES] },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        items: {
          include: {
            serviceItem: {
              select: {
                category: { select: { name: true } },
              },
            },
            partItem: {
              select: {
                category: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate total spent
    const totalSpent = bookings.reduce((sum, b) => sum + b.totalAmount, 0);

    // Calculate monthly spending breakdown
    const monthlyMap = new Map<string, { amount: number; count: number }>();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Initialize all months with 0
    monthNames.forEach((m) => {
      monthlyMap.set(m, { amount: 0, count: 0 });
    });

    bookings.forEach((b) => {
      const monthName = monthNames[b.createdAt.getMonth()];
      const current = monthlyMap.get(monthName) || { amount: 0, count: 0 };
      monthlyMap.set(monthName, {
        amount: current.amount + b.totalAmount,
        count: current.count + 1,
      });
    });

    const monthlySpending = monthNames.map((m) => {
      const data = monthlyMap.get(m) || { amount: 0, count: 0 };
      return {
        month: m,
        amount: data.amount,
        count: data.count,
      };
    });

    // Calculate equipment/category spending breakdown
    const equipmentMap = new Map<string, { amount: number; count: number }>();
    bookings.forEach((b) => {
      const equipmentName = b.equipment?.name || b.equipment?.category?.name || "General Service";
      const current = equipmentMap.get(equipmentName) || { amount: 0, count: 0 };
      equipmentMap.set(equipmentName, {
        amount: current.amount + b.totalAmount,
        count: current.count + 1,
      });
    });

    const byEquipment = Array.from(equipmentMap.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Calculate current and last month comparison
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthBookings = bookings.filter((b) => {
      const d = b.createdAt;
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const lastMonthBookings = await db.serviceBooking.findMany({
      where: {
        ownerId: session.id,
        status: { in: [...PAID_BOOKING_STATUSES] },
        createdAt: {
          gte: new Date(lastMonthYear, lastMonth, 1),
          lte: new Date(lastMonthYear, lastMonth + 1, 0, 23, 59, 59),
        },
      },
      select: { totalAmount: true },
    });

    const currentMonthTotal = currentMonthBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const lastMonthTotal = lastMonthBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const monthChange = lastMonthTotal > 0
      ? Math.round(((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
      : 0;

    // Calculate average per service
    const avgPerService = bookings.length > 0 ? totalSpent / bookings.length : 0;

    return NextResponse.json({
      summary: {
        total_spent: totalSpent,
        total_services: bookings.length,
        avg_per_service: avgPerService,
        current_month: currentMonthTotal,
        last_month: lastMonthTotal,
        month_change: monthChange,
      },
      monthly_spending: monthlySpending,
      by_equipment: byEquipment,
    });
  } catch (error: any) {
    console.error("Get spending summary error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
