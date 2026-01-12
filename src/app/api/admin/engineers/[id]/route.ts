import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "isActive must be a boolean" },
        { status: 400 }
      );
    }

    // Check if user exists and is an engineer
    const engineer = await db.user.findUnique({
      where: { id },
    });

    if (!engineer || engineer.role !== "ENGINEER") {
      return NextResponse.json(
        { ok: false, error: "Engineer not found" },
        { status: 404 }
      );
    }

    // Update engineer status
    const updatedEngineer = await db.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: updatedEngineer,
    });
  } catch (error) {
    console.error("Error updating engineer:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update engineer" },
      { status: 500 }
    );
  }
}
