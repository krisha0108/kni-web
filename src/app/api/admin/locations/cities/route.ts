import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const citySchema = z.object({
  stateId: z.string().min(1, "State is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const stateId = searchParams.get("stateId");
    const search = searchParams.get("search") || "";
    const includeInactive = searchParams.get("includeInactive") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {};
    if (stateId) {
      where.stateId = stateId;
    }
    if (search) {
      where.name = { contains: search };
    }
    if (!includeInactive) {
      where.isActive = true;
    }

    const [cities, total] = await Promise.all([
      db.serviceCity.findMany({
        where,
        include: {
          state: { select: { id: true, name: true } },
          _count: { select: { areas: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.serviceCity.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items: cities, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get service cities error:", error);
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
    const validation = citySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const state = await db.serviceState.findUnique({
      where: { id: validation.data.stateId },
    });

    if (!state) {
      return NextResponse.json(
        { ok: false, error: "State not found" },
        { status: 404 }
      );
    }

    const existing = await db.serviceCity.findUnique({
      where: {
        stateId_name: {
          stateId: validation.data.stateId,
          name: validation.data.name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "City with this name already exists in this state" },
        { status: 409 }
      );
    }

    const city = await db.serviceCity.create({
      data: {
        stateId: validation.data.stateId,
        name: validation.data.name,
        isActive: validation.data.isActive ?? true,
        sortOrder: validation.data.sortOrder ?? 0,
      },
      include: {
        state: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, data: city });
  } catch (error) {
    console.error("Create service city error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
