import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { equipmentSchema } from "@/server/validators/equipment";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // Check restaurant access with equipment:read permission
    await requireRestaurantAccess(session, restaurantId, "equipment:read");

    const where: any = {
      restaurantId,
      deletedAt: null,
      ...(status ? { status: status as any } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { serialNumber: { contains: search } },
          { brand: { contains: search } },
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
          category: {
            select: { id: true, name: true },
          },
          subCategory: {
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
    const session = await requireOwnerMobile(request);

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

    // Check restaurant access with equipment:create permission
    await requireRestaurantAccess(session, validation.data.restaurantId, "equipment:create");

    // Verify restaurant exists and is approved
    const restaurant = await db.restaurant.findUnique({
      where: {
        id: validation.data.restaurantId,
        status: "APPROVED",
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or not approved" },
        { status: 404 }
      );
    }

    // Verify category exists
    const category = await db.category.findUnique({
      where: { id: validation.data.categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { ok: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Verify subcategory if provided
    if (validation.data.subCategoryId) {
      const subCategory = await db.subCategory.findUnique({
        where: { id: validation.data.subCategoryId },
      });

      if (!subCategory) {
        return NextResponse.json(
          { ok: false, error: "Subcategory not found" },
          { status: 404 }
        );
      }
    }

    const equipment = await db.equipment.create({
      data: {
        ownerId: session.id,
        restaurantId: validation.data.restaurantId,
        name: validation.data.name,
        categoryId: validation.data.categoryId,
        subCategoryId: validation.data.subCategoryId || null,
        brand: validation.data.brand || null,
        model: validation.data.model || null,
        purchaseDate: new Date(validation.data.purchaseDate),
        warrantyEndDate: validation.data.warrantyEndDate
          ? new Date(validation.data.warrantyEndDate)
          : null,
        serialNumber: validation.data.serialNumber || null,
        installLocation: validation.data.installLocation || null,
        billImageUrl: validation.data.billImageUrl || null,
        warrantyCardUrl: validation.data.warrantyCardUrl || null,
        photoUrls: validation.data.photoUrls || [],
        status: (validation.data.status as any) || "AVAILABLE",
        notes: validation.data.notes || null,
      },
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
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
