import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        threads: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { ok: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Validate access: RBAC if ticket has restaurantId, otherwise check ownerId
    if (ticket.restaurantId) {
      await requireRestaurantAccess(session, ticket.restaurantId, "support:read");
    } else if (ticket.ownerId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true, data: ticket });
  } catch (error) {
    console.error("Get support ticket error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    const ticket = await db.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json(
        { ok: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Validate access: RBAC if ticket has restaurantId, otherwise check ownerId
    if (ticket.restaurantId) {
      await requireRestaurantAccess(session, ticket.restaurantId, "support:create");
    } else if (ticket.ownerId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Only allow deletion of PENDING tickets
    if (ticket.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: "Can only delete pending tickets" },
        { status: 400 }
      );
    }

    await db.supportTicket.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true, message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Delete support ticket error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
