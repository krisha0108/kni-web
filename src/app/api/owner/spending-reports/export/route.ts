import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getMobileSession } from "@/server/auth/mobile-session";
import { db } from "@/server/db";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";

export async function GET(request: NextRequest) {
  try {
    // Try cookie-based session first, then mobile bearer token
    let session = await getSession();
    if (!session) {
      session = await getMobileSession(request);
    }

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access with expenses:read permission
    await requireRestaurantAccess(session, restaurantId, "expenses:read");

    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found" },
        { status: 404 }
      );
    }

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

    // Fetch all bookings for the period
    const bookings = await db.serviceBooking.findMany({
      where: {
        restaurantId,
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
                name: true,
                category: { select: { name: true } },
              },
            },
            partItem: {
              select: {
                name: true,
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

    // Format all bookings for detailed report
    const bookingDetails = bookings.map((b) => ({
      id: b.id,
      date: b.createdAt.toISOString(),
      status: b.status,
      equipment: b.equipment?.name || "General",
      amount: b.totalAmount,
      items: b.items.map((item) => ({
        name: item.serviceItem?.name || item.partItem?.name || "Item",
        qty: item.qty,
        price: item.priceSnapshot,
      })),
    }));

    const reportData = {
      restaurantName: restaurant.name,
      period: month ? `${monthNames[month - 1]} ${year}` : `Year ${year}`,
      generatedAt: new Date().toISOString(),
      summary: {
        totalSpent,
        totalServices: bookings.length,
        avgPerService: bookings.length > 0 ? totalSpent / bookings.length : 0,
      },
      monthlySpending,
      byEquipment,
      bookings: bookingDetails,
    };

    return NextResponse.json({
      ok: true,
      data: reportData,
    });
  } catch (error) {
    console.error("Export spending report error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
