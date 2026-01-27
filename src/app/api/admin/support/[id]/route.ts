import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const updateTicketSchema = z.object({
  status: z.enum(["PENDING", "SEEN", "ON_WORK", "REJECTED", "COMPLETED"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            city: true,
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

    // Auto-update status: PENDING → SEEN when admin views the ticket
    if (ticket.status === "PENDING") {
      await db.supportTicket.update({
        where: { id },
        data: { status: "SEEN", updatedAt: new Date() },
      });
      ticket.status = "SEEN";
    }

    return NextResponse.json({ ok: true, data: ticket });
  } catch (error) {
    console.error("Get ticket error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = updateTicketSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const ticket = await db.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json(
        { ok: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    const updatedTicket = await db.supportTicket.update({
      where: { id },
      data: {
        ...validation.data,
        updatedAt: new Date(),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            threads: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: updatedTicket });
  } catch (error) {
    console.error("Update ticket error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
