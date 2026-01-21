import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { getUserRestaurants } from "@/server/auth/restaurant-rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const restaurants = await getUserRestaurants(session.id);

    return NextResponse.json({ ok: true, data: restaurants });
  } catch (error) {
    console.error("Get accessible restaurants error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
