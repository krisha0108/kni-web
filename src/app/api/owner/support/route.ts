import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess, getRestaurantOwnerId } from "@/server/auth/restaurant-rbac";
import { z } from "zod";
import { createNotificationForRole } from "@/server/notifications/service";
import { generateReferenceNumber } from "@/server/reference-number";

const createTicketSchema = z.object({
  restaurantId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  equipmentName: z.string().optional(),
  category: z.string().default("General"),
  description: z.string().min(1, "Description is required"),
  photoUrl: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    if (!restaurantId) {
      return NextResponse.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    await requireRestaurantAccess(session, restaurantId, "support:read");

    const where: any = {
      restaurantId,
    };

    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }

    const [tickets, total] = await Promise.all([
      db.supportTicket.findMany({
        where,
        include: {
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
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.supportTicket.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: tickets,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Get support tickets error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    const body = await request.json();
    const validation = createTicketSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { restaurantId, title, equipmentName, category, description, photoUrl } = validation.data;

    // If restaurantId provided, verify access
    if (restaurantId) {
      await requireRestaurantAccess(session, restaurantId, "support:create");
    }

    // Get actual owner ID for FK
    const ownerId = restaurantId
      ? await getRestaurantOwnerId(restaurantId)
      : session.id;

    const ticket = await db.$transaction(async (tx) => {
      const ticketNumber = await generateReferenceNumber(tx, () => tx.supportTicket.count(), "TKT");
      return tx.supportTicket.create({
        data: {
          ticketNumber,
          ownerId,
          restaurantId: restaurantId || null,
          title,
          equipmentName: equipmentName || null,
          category,
          description,
          photoUrl: photoUrl || null,
        },
        include: {
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
    });

    // Notify admins about new support ticket
    createNotificationForRole(
      "ADMIN",
      "New Support Ticket",
      `${session.name} created a support ticket: "${body.title}"`,
      "SYSTEM",
      `/admin/support/${ticket.id}`
    ).catch(console.error);

    return NextResponse.json({ ok: true, data: ticket });
  } catch (error) {
    console.error("Create support ticket error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
