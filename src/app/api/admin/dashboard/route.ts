import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getSession } from '@/server/auth/session';

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session;

    const [
      pendingRestaurants,
      pendingVendors,
      pendingBookings,
      totalCategories,
      totalEngineers,
      totalServices,
    ] = await Promise.all([
      db.restaurant.count({ where: { status: "PENDING" } }),
      db.vendorProfile.count({ where: { approvalStatus: "PENDING" } }),
      db.serviceBooking.count({ where: { status: "PAYMENT_UPLOADED" } }),
      db.category.count({ where: { isActive: true, deletedAt: null } }),
      db.user.count({ where: { role: "ENGINEER", isActive: true } }),
      db.serviceItem.count({ where: { isActive: true, deletedAt: null } }),
    ]);

    // Fetch revenue data
    const completedBookings = await db.serviceBooking.findMany({
      where: {
        status: "COMPLETED"
      },
      select: {
        id: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const totalRevenue = completedBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    const averageBookingValue = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;

    // Revenue by month (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const revenueByMonth = completedBookings.reduce((acc, booking) => {
      const date = new Date(booking.updatedAt || booking.createdAt);
      if (date >= sixMonthsAgo) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

        if (!acc[monthKey]) {
          acc[monthKey] = { month: monthName, revenue: 0, bookings: 0 };
        }
        acc[monthKey].revenue += (booking.totalAmount || 0) / 100;
        acc[monthKey].bookings += 1;
      }
      return acc;
    }, {} as Record<string, { month: string; revenue: number; bookings: number }>);

    const revenueChartData = Object.values(revenueByMonth).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    // Booking status distribution
    const bookingsByStatus = await db.serviceBooking.groupBy({
      by: ['status'],
      _count: true
    });

    const bookingStatusData = bookingsByStatus.map(item => ({
      name: item.status.replace(/_/g, ' '),
      value: item._count
    }));

    // Top services by bookings
    const topServices = await db.serviceBookingItem.groupBy({
      by: ['serviceItemId'],
      where: {
        serviceItemId: { not: null }
      },
      _count: true,
      _sum: {
        priceSnapshot: true
      },
      orderBy: {
        _count: {
          serviceItemId: 'desc'
        }
      },
      take: 5
    });

    const topServicesData = await Promise.all(
      topServices.map(async (item) => {
        const service = await db.serviceItem.findUnique({
          where: { id: item.serviceItemId! },
          select: { name: true }
        });
        return {
          name: service?.name || 'Unknown',
          bookings: item._count,
          revenue: (item._sum.priceSnapshot || 0) / 100
        };
      })
    );

    // Engineer performance
    const engineerPerformance = await db.engineerAssignment.groupBy({
      by: ['engineerId'],
      where: {
        status: 'COMPLETED'
      },
      _count: true
    });

    const topEngineers = await Promise.all(
      engineerPerformance
        .sort((a, b) => b._count - a._count)
        .slice(0, 5)
        .map(async (item) => {
          const user = await db.user.findUnique({
            where: { id: item.engineerId },
            select: { name: true }
          });
          return {
            name: user?.name || 'Unknown',
            completedJobs: item._count
          };
        })
    );

    // AMC subscriptions
    const amcStats = await db.aMCSubscription.groupBy({
      by: ['status'],
      _count: true
    });

    const amcData = amcStats.map(item => ({
      name: item.status,
      value: item._count
    }));

    const statCards = [
      {
        title: "Total Revenue",
        value: `₹${(totalRevenue / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        icon: "DollarSign",
        description: "From completed bookings",
      },
      {
        title: "Completed Bookings",
        value: completedBookings.length,
        icon: "CheckCircle",
        description: "All time",
      },
      {
        title: "Average Booking Value",
        value: `₹${(averageBookingValue / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        icon: "TrendingUp",
        description: "Per booking",
      },
      {
        title: "Pending Restaurants",
        value: pendingRestaurants,
        icon: "Building2",
        description: "Awaiting approval",
      },
      {
        title: "Pending Vendors",
        value: pendingVendors,
        icon: "Store",
        description: "Awaiting approval",
      },
      {
        title: "Pending Payments",
        value: pendingBookings,
        icon: "ClipboardList",
        description: "Need verification",
      },
      {
        title: "Active Categories",
        value: totalCategories,
        icon: "FolderOpen",
        description: "In catalog",
      },
      {
        title: "Active Engineers",
        value: totalEngineers,
        icon: "Users",
        description: "Available for jobs",
      },
      {
        title: "Active Services",
        value: totalServices,
        icon: "Package",
        description: "In catalog",
      },
    ];

    return NextResponse.json({
      ok: true,
      data: {
        statCards,
        revenueChartData,
        bookingStatusData,
        topServicesData,
        topEngineers,
        amcData
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
