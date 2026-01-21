import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";

/**
 * GET /api/restaurant-owner/my-equipment
 * Fetch owner's equipment
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const equipment = await db.equipment.findMany({
      where: {
        ownerId: session.id,
        deletedAt: null,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = equipment.map((eq) => ({
      id: eq.id,
      name: eq.name || eq.category?.name || "Equipment",
      equipment_type: eq.category?.name,
      brand: eq.brand,
      model: eq.model,
      serial_number: eq.serialNumber,
      purchase_date: eq.purchaseDate?.toISOString(),
      warranty_expiry: eq.warrantyEndDate?.toISOString(),
      restaurant: eq.restaurant
        ? {
            id: eq.restaurant.id,
            name: eq.restaurant.name,
          }
        : null,
      status: eq.status,
      created_at: eq.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("Get equipment error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/restaurant-owner/my-equipment
 * Add new equipment
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      category_id,
      name,
      brand,
      model,
      serial_number,
      purchase_date,
      warranty_expiry,
      restaurant_id,
    } = body;

    if (!restaurant_id || !name || !purchase_date) {
      return NextResponse.json(
        { ok: false, error: "Restaurant, name, and purchase date are required" },
        { status: 400 }
      );
    }

    const equipment = await db.equipment.create({
      data: {
        ownerId: session.id,
        restaurantId: restaurant_id,
        categoryId: category_id || null,
        name: name,
        brand: brand || null,
        model: model || null,
        serialNumber: serial_number || null,
        purchaseDate: new Date(purchase_date),
        warrantyEndDate: warranty_expiry ? new Date(warranty_expiry) : null,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: equipment.id,
        name: equipment.name,
        created_at: equipment.createdAt.toISOString(),
      },
      message: "Equipment added successfully",
    });
  } catch (error: any) {
    console.error("Create equipment error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
