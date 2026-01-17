import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/server/auth/rbac";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwner();

    // Get Khatabook connection status
    const connection = await db.khatabookConnection.findUnique({
      where: { userId: session.id },
      select: {
        id: true,
        businessId: true,
        businessName: true,
        isActive: true,
        autoSync: true,
        lastSyncAt: true,
        syncError: true,
        createdAt: true,
        restaurantId: true,
      },
    });

    if (!connection) {
      return NextResponse.json({
        ok: true,
        data: {
          connected: false,
        },
      });
    }

    // Get sync statistics
    const [pendingCount, syncedCount, failedCount] = await Promise.all([
      db.khatabookTransaction.count({
        where: {
          connectionId: connection.id,
          syncStatus: "PENDING",
        },
      }),
      db.khatabookTransaction.count({
        where: {
          connectionId: connection.id,
          syncStatus: "SYNCED",
        },
      }),
      db.khatabookTransaction.count({
        where: {
          connectionId: connection.id,
          syncStatus: "FAILED",
        },
      }),
    ]);

    // Get recent sync logs
    const recentSyncs = await db.khatabookSyncLog.findMany({
      where: { connectionId: connection.id },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: {
        id: true,
        syncType: true,
        status: true,
        itemsSynced: true,
        itemsFailed: true,
        startedAt: true,
        completedAt: true,
        duration: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        connected: true,
        connection: {
          ...connection,
          stats: {
            pending: pendingCount,
            synced: syncedCount,
            failed: failedCount,
            total: pendingCount + syncedCount + failedCount,
          },
        },
        recentSyncs,
      },
    });
  } catch (error: any) {
    console.error("Get Khatabook status error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
