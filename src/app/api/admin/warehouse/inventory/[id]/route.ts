import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { warehouseInventoryUpdateSchema } from "@/server/validators/warehouse";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const inventory = await db.warehouseInventory.findUnique({
      where: { id },
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
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!inventory) {
      return NextResponse.json(
        { ok: false, error: "Inventory not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: inventory,
    });
  } catch (error) {
    console.error("Get warehouse inventory error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = warehouseInventoryUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if inventory exists
    const existingInventory = await db.warehouseInventory.findUnique({
      where: { id },
    });

    if (!existingInventory) {
      return NextResponse.json(
        { ok: false, error: "Inventory not found" },
        { status: 404 }
      );
    }

    // Update inventory
    const inventory = await db.warehouseInventory.update({
      where: { id },
      data: {
        lowStockThreshold: validation.data.lowStockThreshold,
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
    });

    return NextResponse.json({ ok: true, data: inventory });
  } catch (error) {
    console.error("Update warehouse inventory error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
