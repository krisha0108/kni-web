import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { updateRoleSchema } from "@/server/validators/team";
import { RestaurantRole } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await requireOwner();
    const { memberId } = await params;
    const body = await request.json();
    const validation = updateRoleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Get member to check restaurant
    const member = await db.restaurantMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json(
        { ok: false, error: "Member not found" },
        { status: 404 }
      );
    }

    // Check if user has team:update permission
    await requireRestaurantAccess(session, member.restaurantId, "team:update");

    // Update role
    const updated = await db.restaurantMember.update({
      where: { id: memberId },
      data: { role: validation.data.role as RestaurantRole },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Update team member error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await requireOwner();
    const { memberId } = await params;

    // Get member to check restaurant
    const member = await db.restaurantMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json(
        { ok: false, error: "Member not found" },
        { status: 404 }
      );
    }

    // Check if user has team:remove permission
    await requireRestaurantAccess(session, member.restaurantId, "team:remove");

    // Delete membership
    await db.restaurantMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ ok: true, message: "Member removed" });
  } catch (error) {
    console.error("Remove team member error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
