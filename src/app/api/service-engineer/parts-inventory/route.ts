import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * GET /api/service-engineer/parts-inventory
 * Get parts inventory that engineer has received/has on hand
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    // Get approved and delivered part requests for this engineer
    const partRequests = await db.partRequest.findMany({
      where: {
        engineerId: session.id,
        status: {
          in: ["APPROVED", "DISPATCHED", "DELIVERED"],
        },
      },
      include: {
        partItem: {
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Aggregate parts by part ID
    const inventoryMap = new Map();

    for (const request of partRequests) {
      const part = request.partItem;
      const partId = request.partItemId;

      if (inventoryMap.has(partId)) {
        const existing = inventoryMap.get(partId);
        existing.quantity += request.quantity;
      } else {
        inventoryMap.set(partId, {
          id: partId,
          part_id: partId,
          name: part?.name || "Unknown Part",
          description: part?.description || "",
          category: part?.category?.name || "Uncategorized",
          category_id: part?.category?.id,
          price: part?.price || 0,
          quantity: request.quantity,
          sku: `SKU-${partId.substring(0, 8).toUpperCase()}`,
        });
      }
    }

    const inventory = Array.from(inventoryMap.values());

    return NextResponse.json({
      ok: true,
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error("Get parts inventory error:", error);
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
