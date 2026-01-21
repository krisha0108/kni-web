import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * GET /api/service-engineer/parts
 * Get available parts for the service engineer to request
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    // Fetch all active parts
    const parts = await db.partItem.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        inventory: {
          select: {
            currentStock: true,
            lowStockThreshold: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Transform to expected format
    const transformedParts = parts.map((part) => ({
      id: part.id,
      title: part.name,
      description: part.description,
      sku: `SKU-${part.id.substring(0, 8).toUpperCase()}`,
      price: part.price,
      category: part.category?.name || "Uncategorized",
      category_id: part.category?.id,
      stock_quantity: part.inventory?.currentStock ?? 100,
      reorder_level: part.inventory?.lowStockThreshold ?? 10,
    }));

    return NextResponse.json({
      ok: true,
      success: true,
      data: transformedParts,
    });
  } catch (error) {
    console.error("Get parts error:", error);
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
