import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const stateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const includeInactive = searchParams.get("includeInactive") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {};
    if (search) {
      where.name = { contains: search };
    }
    if (!includeInactive) {
      where.isActive = true;
    }

    const [states, total] = await Promise.all([
      db.serviceState.findMany({
        where,
        include: {
          _count: {
            select: { cities: true },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.serviceState.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items: states, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get service states error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = stateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const existing = await db.serviceState.findUnique({
      where: { name: validation.data.name },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "State with this name already exists" },
        { status: 409 }
      );
    }

    const state = await db.serviceState.create({
      data: {
        name: validation.data.name,
        isActive: validation.data.isActive ?? true,
        sortOrder: validation.data.sortOrder ?? 0,
      },
    });

    return NextResponse.json({ ok: true, data: state });
  } catch (error) {
    console.error("Create service state error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
