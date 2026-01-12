import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";

// GET /api/owner/equipment/[id] - Get individual equipment details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id: equipmentId } = await params;

    const equipment = await db.equipment.findFirst({
      where: {
        id: equipmentId,
        ownerId: session.id,
        deletedAt: null,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { ok: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: equipment });
  } catch (error) {
    console.error("Get equipment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
