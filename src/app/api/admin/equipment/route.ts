import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const createEquipmentSchema = z.object({
  ownerId: z.string().min(1, "Owner is required"),
  restaurantId: z.string().min(1, "Restaurant is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  categoryId: z.string().min(1, "Category is required"),
  subCategoryId: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  warrantyEndDate: z.string().optional(),
  serialNumber: z.string().optional(),
  installLocation: z.string().optional(),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE", "RETIRED"]).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/admin/equipment?restaurantId=xxx
 * List equipment for a restaurant (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const restaurantId = request.nextUrl.searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "restaurantId is required" },
        { status: 400 }
      );
    }

    const equipment = await db.equipment.findMany({
      where: { restaurantId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: equipment });
  } catch (error) {
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
    const validation = createEquipmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify owner exists
    const owner = await db.user.findFirst({
      where: { id: data.ownerId, role: "OWNER", deletedAt: null },
    });

    if (!owner) {
      return NextResponse.json(
        { ok: false, error: "Owner not found" },
        { status: 404 }
      );
    }

    // Verify restaurant exists, belongs to owner, and is approved
    const restaurant = await db.restaurant.findFirst({
      where: { id: data.restaurantId, ownerId: data.ownerId, status: "APPROVED" },
    });

    if (!restaurant) {
      return NextResponse.json(
        { ok: false, error: "Restaurant not found or not approved" },
        { status: 404 }
      );
    }

    // Verify category exists
    const category = await db.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { ok: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Verify subcategory if provided
    if (data.subCategoryId) {
      const subCategory = await db.subCategory.findUnique({
        where: { id: data.subCategoryId },
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
        ownerId: data.ownerId,
        restaurantId: data.restaurantId,
        name: data.name,
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId || null,
        brand: data.brand || null,
        model: data.model || null,
        purchaseDate: new Date(data.purchaseDate),
        warrantyEndDate: data.warrantyEndDate ? new Date(data.warrantyEndDate) : null,
        serialNumber: data.serialNumber || null,
        installLocation: data.installLocation || null,
        status: (data.status as any) || "AVAILABLE",
        notes: data.notes || null,
      },
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, data: equipment }, { status: 201 });
  } catch (error) {
    console.error("Create equipment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
