import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { db } from "@/server/db";
import { z } from "zod";

const updateSettingsSchema = z.object({
  autoSync: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const body = await request.json();
    const validation = updateSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid input",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

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

    // Update settings
    const updated = await db.khatabookConnection.update({
      where: { userId: session.id },
      data: validation.data,
    });

    return NextResponse.json({
      ok: true,
      message: "Settings updated successfully",
      data: {
        autoSync: updated.autoSync,
      },
    });
  } catch (error: any) {
    console.error("Update Khatabook settings error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
