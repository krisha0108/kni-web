import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    const ticket = await db.supportTicket.findFirst({
      where: {
        id,
        ownerId: session.id,
      },
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

    // Verify ticket ownership
    const ticket = await db.supportTicket.findFirst({
      where: {
        id,
        ownerId: session.id,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { ok: false, error: "Ticket not found" },
        { status: 404 }
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
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
