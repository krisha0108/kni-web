import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { syncAllPendingTransactions } from "@/server/khatabook/service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();

    // Get user's Khatabook connection
    const connection = await db.khatabookConnection.findUnique({
      where: { userId: session.id },
    });

    if (!connection) {
      return NextResponse.json(
        {
          ok: false,
          error: "Khatabook not connected",
        },
        { status: 404 }
      );
    }

    if (!connection.isActive) {
      return NextResponse.json(
        {
          ok: false,
          error: "Khatabook connection is inactive. Please reconnect.",
        },
        { status: 400 }
      );
    }

    // Sync all pending transactions
    const result = await syncAllPendingTransactions(connection.id);

    return NextResponse.json({
      ok: true,
      message: "Sync completed",
      data: {
        synced: result.synced,
        failed: result.failed,
        errors: result.errors,
      },
    });
  } catch (error: any) {
    console.error("Khatabook sync error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
