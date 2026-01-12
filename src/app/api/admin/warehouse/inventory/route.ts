import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { warehouseInventorySchema } from "@/server/validators/warehouse";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const lowStock = searchParams.get("lowStock");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {
      partItem: {
        deletedAt: null,
        ...(categoryId ? { categoryId } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        } : {}),
      },
    };

    // If lowStock filter is enabled, only show items below threshold
    const havingCondition = lowStock === "true"
      ? { currentStock: { lt: { lowStockThreshold: true } } }
      : undefined;

    const [inventories, total] = await Promise.all([
      db.warehouseInventory.findMany({
        where: {
          ...where,
          ...(lowStock === "true" ? {
            currentStock: {
              lt: db.warehouseInventory.fields.lowStockThreshold,
            },
          } : {}),
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
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.warehouseInventory.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { inventories, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get warehouse inventory error:", error);
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
    const validation = warehouseInventorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check if part item exists
    const partItem = await db.partItem.findFirst({
      where: {
        id: validation.data.partItemId,
        deletedAt: null,
      },
    });

    if (!partItem) {
      return NextResponse.json(
        { ok: false, error: "Part item not found" },
        { status: 404 }
      );
    }

    // Check if inventory already exists for this part
    const existingInventory = await db.warehouseInventory.findUnique({
      where: { partItemId: validation.data.partItemId },
    });

    if (existingInventory) {
      return NextResponse.json(
        { ok: false, error: "Inventory already exists for this part item" },
        { status: 400 }
      );
    }

    // Create inventory
    const inventory = await db.warehouseInventory.create({
      data: {
        partItemId: validation.data.partItemId,
        currentStock: validation.data.currentStock || 0,
        lowStockThreshold: validation.data.lowStockThreshold || 10,
        lastRestockedAt: validation.data.currentStock && validation.data.currentStock > 0
          ? new Date()
          : null,
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
    console.error("Create warehouse inventory error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
