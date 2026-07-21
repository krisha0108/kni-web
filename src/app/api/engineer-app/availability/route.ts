import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * PUT /api/engineer-app/availability
 * Toggle engineer availability status
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);
    const body = await request.json();

    const { availability } = body;

    // Convert to boolean
    const isAvailable = availability === 1 || availability === true || availability === "1";

    // Update user availability
    const updatedUser = await db.user.update({
      where: { id: session.id },
      data: { isAvailable },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      message: isAvailable ? "You are now available" : "You are now unavailable",
      availability: updatedUser.isAvailable,
    });
  } catch (error) {
    console.error("Update availability error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

/**
 * GET /api/engineer-app/availability
 * Get engineer availability status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    const user = await db.user.findUnique({
      where: { id: session.id },
      select: { isAvailable: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      availability: user.isAvailable,
    });
  } catch (error) {
    console.error("Get availability error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
