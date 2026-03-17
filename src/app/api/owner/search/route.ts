import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { getRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const restaurantId = searchParams.get("restaurantId") || "";

    if (q.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "restaurantId is required" },
        { status: 400 }
      );
    }

    // Verify restaurant access
    const access = await getRestaurantAccess(session.id, restaurantId);
    if (!access) {
      return NextResponse.json(
        { ok: false, error: "Access denied: Not a member of this restaurant" },
        { status: 403 }
      );
    }

    // Run all searches in parallel
    const [equipment, bookings, expenses, staff, orders, vendors] =
      await Promise.all([
        // 1. Equipment — match name, brand, serialNumber, category name
        db.equipment.findMany({
          where: {
            restaurantId,
            deletedAt: null,
            OR: [
              { name: { contains: q } },
              { brand: { contains: q } },
              { serialNumber: { contains: q } },
              { category: { name: { contains: q } } },
            ],
          },
          select: {
            id: true,
            name: true,
            brand: true,
            status: true,
          },
          take: 5,
          orderBy: { updatedAt: "desc" },
        }),

        // 2. Bookings — match ID prefix, restaurant name, status
        db.serviceBooking.findMany({
          where: {
            restaurantId,
            OR: [
              { id: { contains: q } },
              { restaurant: { name: { contains: q } } },
            ],
          },
          select: {
            id: true,
            status: true,
            totalAmount: true,
            restaurant: { select: { name: true } },
          },
          take: 5,
          orderBy: { createdAt: "desc" },
        }),

        // 3. Expenses — match description, category
        db.expense.findMany({
          where: {
            restaurantId,
            deletedAt: null,
            OR: [
              { description: { contains: q } },
            ],
          },
          select: {
            id: true,
            description: true,
            category: true,
            amount: true,
          },
          take: 5,
          orderBy: { expenseDate: "desc" },
        }),

        // 4. Staff — match name, phone, designation
        db.staff.findMany({
          where: {
            restaurantId,
            OR: [
              { name: { contains: q } },
              { phone: { contains: q } },
              { designation: { contains: q } },
            ],
          },
          select: {
            id: true,
            name: true,
            designation: true,
            phone: true,
          },
          take: 5,
          orderBy: { createdAt: "desc" },
        }),

        // 5. Marketplace Orders — match ID prefix, vendor name
        db.marketplaceOrder.findMany({
          where: {
            restaurantId,
            OR: [
              { id: { contains: q } },
              { vendor: { name: { contains: q } } },
            ],
          },
          select: {
            id: true,
            totalAmount: true,
            status: true,
            vendor: { select: { name: true } },
          },
          take: 5,
          orderBy: { createdAt: "desc" },
        }),

        // 6. Vendors — match vendor name (vendors who have orders with this restaurant)
        db.user.findMany({
          where: {
            role: "VENDOR",
            name: { contains: q },
            vendorOrders: {
              some: { restaurantId },
            },
          },
          select: {
            id: true,
            name: true,
          },
          take: 5,
        }),
      ]);

    return NextResponse.json({
      ok: true,
      data: {
        equipment: equipment.map((e) => ({
          id: e.id,
          name: e.name,
          brand: e.brand,
          status: e.status,
          link: `/owner/equipment/${e.id}`,
        })),
        bookings: bookings.map((b) => ({
          id: b.id,
          restaurantName: b.restaurant.name,
          status: b.status,
          amount: b.totalAmount,
          link: `/owner/bookings/${b.id}`,
        })),
        expenses: expenses.map((e) => ({
          id: e.id,
          description: e.description,
          category: e.category,
          amount: e.amount,
          link: `/owner/expenses`,
        })),
        staff: staff.map((s) => ({
          id: s.id,
          name: s.name,
          designation: s.designation,
          phone: s.phone,
          link: `/owner/staff`,
        })),
        orders: orders.map((o) => ({
          id: o.id,
          vendorName: o.vendor.name,
          amount: o.totalAmount,
          status: o.status,
          link: `/owner/marketplace/orders`,
        })),
        vendors: vendors.map((v) => ({
          id: v.id,
          name: v.name,
          link: `/owner/marketplace`,
        })),
      },
    });
  } catch (error: any) {
    console.error("Global search error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
