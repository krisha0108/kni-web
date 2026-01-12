import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const severity = searchParams.get("severity"); // "critical" or "low"

    // Build where condition to find items below threshold
    const inventories = await db.warehouseInventory.findMany({
      where: {
        currentStock: {
          lt: db.warehouseInventory.fields.lowStockThreshold,
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
      orderBy: [
        { currentStock: "asc" },
      ],
    });

    // Filter by severity if specified
    let filteredInventories = inventories;
    if (severity === "critical") {
      // Critical: stock is less than half of threshold
      filteredInventories = inventories.filter(
        (inv) => inv.currentStock < inv.lowStockThreshold / 2
      );
    } else if (severity === "low") {
      // Low: stock is below threshold but not critical
      filteredInventories = inventories.filter(
        (inv) =>
          inv.currentStock < inv.lowStockThreshold &&
          inv.currentStock >= inv.lowStockThreshold / 2
      );
    }

    // Calculate severity for each item
    const alertsWithSeverity = filteredInventories.map((inv) => ({
      ...inv,
      severity:
        inv.currentStock === 0
          ? "OUT_OF_STOCK"
          : inv.currentStock < inv.lowStockThreshold / 2
          ? "CRITICAL"
          : "LOW",
    }));

    return NextResponse.json({
      ok: true,
      data: {
        alerts: alertsWithSeverity,
        total: alertsWithSeverity.length,
        criticalCount: alertsWithSeverity.filter((a) => a.severity === "CRITICAL" || a.severity === "OUT_OF_STOCK").length,
        lowCount: alertsWithSeverity.filter((a) => a.severity === "LOW").length,
      },
    });
  } catch (error) {
    console.error("Get warehouse alerts error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
