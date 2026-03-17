import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";
import { z } from "zod";
import { createNotification, createNotificationForRole } from "@/server/notifications/service";

const createThreadSchema = z.object({
  message: z.string().min(1, "Message is required"),
  imageUrl: z.string().optional(),
});

/**
 * Validate ticket access for the current user.
 * Uses RBAC if ticket has restaurantId, otherwise falls back to ownerId check.
 */
async function validateTicketAccess(
  session: { id: string },
  ticket: { restaurantId: string | null; ownerId: string }
): Promise<boolean> {
  if (ticket.restaurantId) {
    await requireRestaurantAccess(session as any, ticket.restaurantId, "support:read");
    return true;
  }
  return ticket.ownerId === session.id;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    // Verify ticket access
    const ticket = await db.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json(
        { ok: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    const hasAccess = await validateTicketAccess(session, ticket);
    if (!hasAccess) {
      return NextResponse.json(
        { ok: false, error: "Access denied" },
        { status: 403 }
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

    // Verify ticket access
    const ticket = await db.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json(
        { ok: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    const hasAccess = await validateTicketAccess(session, ticket);
    if (!hasAccess) {
      return NextResponse.json(
        { ok: false, error: "Access denied" },
        { status: 403 }
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

    // Notify: if owner replied → notify admins; if admin → notify ticket owner
    const ticketForNotify = await db.supportTicket.findUnique({ where: { id }, select: { ownerId: true, title: true } });
    if (ticketForNotify) {
      if (session.role === "ADMIN") {
        createNotification({ userId: ticketForNotify.ownerId, title: "Support Reply", message: `Admin replied to your ticket: "${ticketForNotify.title}"`, type: "SYSTEM", linkUrl: `/owner/support`, data: { type: "support", ticketId: id } }).catch(console.error);
      } else {
        createNotificationForRole("ADMIN", "Support Reply", `${session.name} replied to ticket: "${ticketForNotify.title}"`, "SYSTEM", `/admin/support/${id}`).catch(console.error);
      }
    }

    return NextResponse.json({ ok: true, data: thread });
  } catch (error: any) {
    console.error("Create thread error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Internal server error" },
      { status: error?.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
