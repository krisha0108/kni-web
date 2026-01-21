import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { z } from "zod";

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

    const where: any = {
      ownerId: session.id,
    };

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

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

    // If restaurantId provided, verify ownership
    if (restaurantId) {
      const restaurant = await db.restaurant.findFirst({
        where: {
          id: restaurantId,
          ownerId: session.id,
        },
      });

      if (!restaurant) {
        return NextResponse.json(
          { ok: false, error: "Restaurant not found" },
          { status: 404 }
        );
      }
    }

    const ticket = await db.supportTicket.create({
      data: {
        ownerId: session.id,
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

    return NextResponse.json({ ok: true, data: ticket });
  } catch (error) {
    console.error("Create support ticket error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
