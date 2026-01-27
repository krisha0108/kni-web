import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { z } from "zod";

const createThreadSchema = z.object({
  message: z.string().min(1, "Message is required"),
  imageUrl: z.string().optional(),
});

export async function GET(
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

    const threads = await db.supportTicketThread.findMany({
      where: { ticketId: id },
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
    });

    return NextResponse.json({ ok: true, data: threads });
  } catch (error) {
    console.error("Get ticket threads error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    const body = await request.json();
    const validation = createThreadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

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

    // Don't allow replies on completed or rejected tickets
    if (ticket.status === "COMPLETED" || ticket.status === "REJECTED") {
      return NextResponse.json(
        { ok: false, error: "Cannot reply to closed tickets" },
        { status: 400 }
      );
    }

    const thread = await db.supportTicketThread.create({
      data: {
        ticketId: id,
        userId: session.id,
        message: validation.data.message,
        imageUrl: validation.data.imageUrl || null,
        isAdmin: false,
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

    // Update ticket updatedAt
    await db.supportTicket.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, data: thread });
  } catch (error: any) {
    console.error("Create thread error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Internal server error", stack: error?.stack },
      { status: 500 }
    );
  }
}
