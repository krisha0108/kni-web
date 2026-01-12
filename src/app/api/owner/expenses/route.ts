import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { expenseSchema } from "@/server/validators/expense";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwner();

    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {
      ownerId: session.id,
      deletedAt: null,
      ...(restaurantId ? { restaurantId } : {}),
      ...(category ? { category: category as any } : {}),
    };

    // Add date range filter
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) {
        where.expenseDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.expenseDate.lte = new Date(endDate);
      }
    }

    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { expenseDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.expense.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { expenses, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get expenses error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();

    const body = await request.json();
    const validation = expenseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify restaurant ownership
    const restaurant = await db.restaurant.findFirst({
      where: {
        id: validation.data.restaurantId,
        ownerId: session.id,
        status: "APPROVED",
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or not approved" },
        { status: 404 }
      );
    }

    // Create expense
    const expense = await db.expense.create({
      data: {
        ownerId: session.id,
        restaurantId: validation.data.restaurantId,
        category: validation.data.category as any,
        amount: Math.round(validation.data.amount * 100), // Convert to paise
        expenseDate: new Date(validation.data.expenseDate),
        description: validation.data.description,
        receiptImageUrl: validation.data.receiptImageUrl || null,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: expense });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
