import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const areaSchema = z.object({
  cityId: z.string().min(1, "City is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const cityId = searchParams.get("cityId");
    const stateId = searchParams.get("stateId");
    const search = searchParams.get("search") || "";
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: any = {};
    if (cityId) {
      where.cityId = cityId;
    }
    if (stateId) {
      where.city = { stateId };
    }
    if (search) {
      where.name = { contains: search };
    }
    if (!includeInactive) {
      where.isActive = true;
    }

    const areas = await db.serviceArea.findMany({
      where,
      include: {
        city: {
          select: {
            id: true,
            name: true,
            state: { select: { id: true, name: true } },
          },
        },
        _count: { select: { locationRequests: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      data: { items: areas },
    });
  } catch (error) {
    console.error("Get service areas error:", error);
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
    const validation = areaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const city = await db.serviceCity.findUnique({
      where: { id: validation.data.cityId },
    });

    if (!city) {
      return NextResponse.json(
        { ok: false, error: "City not found" },
        { status: 404 }
      );
    }

    const existing = await db.serviceArea.findUnique({
      where: {
        cityId_name: {
          cityId: validation.data.cityId,
          name: validation.data.name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Area with this name already exists in this city" },
        { status: 409 }
      );
    }

    const area = await db.serviceArea.create({
      data: {
        cityId: validation.data.cityId,
        name: validation.data.name,
        isActive: validation.data.isActive ?? true,
        sortOrder: validation.data.sortOrder ?? 0,
      },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            state: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: area });
  } catch (error) {
    console.error("Create service area error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
