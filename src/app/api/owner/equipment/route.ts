import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { equipmentSchema } from "@/server/validators/equipment";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwner();

    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {
      ownerId: session.id,
      deletedAt: null,
      ...(restaurantId ? { restaurantId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { serialNumber: { contains: search } },
          { category: { contains: search } },
        ],
      } : {}),
    };

    const [items, total] = await Promise.all([
      db.equipment.findMany({
        where,
        include: {
          restaurant: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.equipment.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get equipment error:", error);
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
    console.log('Equipment creation request body:', JSON.stringify(body, null, 2));

    const validation = equipmentSchema.safeParse(body);

    if (!validation.success) {
      console.error('Equipment validation failed:', JSON.stringify(validation.error.issues, null, 2));
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

    const equipment = await db.equipment.create({
      data: {
        ownerId: session.id,
        restaurantId: validation.data.restaurantId,
        name: validation.data.name,
        category: validation.data.category,
        purchaseDate: new Date(validation.data.purchaseDate),
        warrantyEndDate: validation.data.warrantyEndDate
          ? new Date(validation.data.warrantyEndDate)
          : null,
        serialNumber: validation.data.serialNumber || null,
        billImageUrl: validation.data.billImageUrl || null,
        warrantyCardUrl: validation.data.warrantyCardUrl || null,
        photoUrls: validation.data.photoUrls || [],
        status: (validation.data.status as any) || "AVAILABLE",
        notes: validation.data.notes || null,
      },
    });

    return NextResponse.json({ ok: true, data: equipment });
  } catch (error) {
    console.error("Create equipment error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
