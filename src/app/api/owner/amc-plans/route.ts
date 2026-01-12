import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireOwner();

    const searchParams = request.nextUrl.searchParams;
    const duration = searchParams.get("duration");

    const where: any = {
      deletedAt: null,
      isActive: true,
      ...(duration ? { duration: duration as any } : {}),
    };

    const plans = await db.aMCPlan.findMany({
      where,
      orderBy: [
        { duration: "asc" },
        { price: "asc" },
      ],
    });

    return NextResponse.json({
      ok: true,
      data: plans,
    });
  } catch (error) {
    console.error("Get AMC plans error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
