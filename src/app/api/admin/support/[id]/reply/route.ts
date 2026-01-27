import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const replySchema = z.object({
  message: z.string().min(1, "Message is required"),
  imageUrl: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = replySchema.safeParse(body);

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

    // Create reply thread
    const thread = await db.supportTicketThread.create({
      data: {
        ticketId: id,
        userId: session.id,
        message: validation.data.message,
        imageUrl: validation.data.imageUrl || null,
        isAdmin: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    // Auto-update status when admin replies:
    // PENDING or SEEN → ON_WORK (admin is now working on the ticket)
    if (ticket.status === "PENDING" || ticket.status === "SEEN") {
      await db.supportTicket.update({
        where: { id },
        data: { status: "ON_WORK", updatedAt: new Date() },
      });
    } else {
      await db.supportTicket.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true, data: thread });
  } catch (error) {
    console.error("Admin reply error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
