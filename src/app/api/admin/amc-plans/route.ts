import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { amcPlanSchema } from "@/server/validators/amc";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get("isActive");
    const duration = searchParams.get("duration");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {
      deletedAt: null,
      ...(isActive !== null && isActive !== undefined ? { isActive: isActive === "true" } : {}),
      ...(duration ? { duration: duration as any } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      } : {}),
    };

    const [plans, total] = await Promise.all([
      db.aMCPlan.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.aMCPlan.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { plans, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get AMC plans error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = amcPlanSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if plan name already exists
    const existingPlan = await db.aMCPlan.findFirst({
      where: {
        name: validation.data.name,
        deletedAt: null,
      },
    });

    if (existingPlan) {
      return NextResponse.json(
        { ok: false, error: "A plan with this name already exists" },
        { status: 400 }
      );
    }

    const plan = await db.aMCPlan.create({
      data: {
        name: validation.data.name,
        description: validation.data.description || null,
        duration: validation.data.duration as any,
        price: validation.data.price,
        serviceLimit: validation.data.serviceLimit,
        featuresJson: validation.data.featuresJson || null,
        isActive: validation.data.isActive !== undefined ? validation.data.isActive : true,
      },
    });

    return NextResponse.json({ ok: true, data: plan });
  } catch (error) {
    console.error("Create AMC plan error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
