import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";
import bcrypt from "bcrypt";

const createOwnerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all"; // all, active, inactive
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    // Build where clause
    const where: Record<string, unknown> = {
      role: "OWNER",
      deletedAt: null,
    };

    // Status filter
    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    // Get owners with restaurant count
    const [items, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              restaurants: true,
              serviceBookings: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    // Get stats for the summary cards
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalOwners, activeOwners, inactiveOwners, newThisMonth] = await Promise.all([
      db.user.count({
        where: { role: "OWNER", deletedAt: null },
      }),
      db.user.count({
        where: { role: "OWNER", isActive: true, deletedAt: null },
      }),
      db.user.count({
        where: { role: "OWNER", isActive: false, deletedAt: null },
      }),
      db.user.count({
        where: {
          role: "OWNER",
          deletedAt: null,
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    // Transform items to include computed fields
    const transformedItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      phone: item.phone,
      isActive: item.isActive,
      createdAt: item.createdAt,
      restaurantCount: item._count.restaurants,
      totalBookings: item._count.serviceBookings,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        items: transformedItems,
        total,
        page,
        pageSize,
        stats: {
          totalOwners,
          activeOwners,
          inactiveOwners,
          newThisMonth,
        },
      },
    });
  } catch (error) {
    console.error("Get owners error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validation = createOwnerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = validation.data;

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const owner = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: "OWNER",
        isActive: true,
        emailVerified: true,
        ownerProfile: { create: {} },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    return NextResponse.json({ ok: true, data: owner }, { status: 201 });
  } catch (error) {
    console.error("Create owner error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
