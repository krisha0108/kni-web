import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { notifyAdminsNewRestaurantRequest } from "@/server/notifications/service";
import { z } from "zod";

const createRestaurantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
});

export async function GET() {
  try {
    const session = await requireOwner();

    const restaurant = await db.restaurant.findFirst({
      where: { ownerId: session.id },
      orderBy: { createdAt: "desc" },
      include: {
        categories: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ ok: true, data: restaurant });
  } catch (error) {
    console.error("Get restaurant error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();

    const body = await request.json();
    const validation = createRestaurantSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const restaurant = await db.restaurant.create({
      data: {
        name: validation.data.name,
        address: validation.data.address,
        city: validation.data.city,
        ownerId: session.id,
        status: "PENDING",
      },
    });

    await notifyAdminsNewRestaurantRequest(restaurant.name, session.name);

    return NextResponse.json({ ok: true, data: restaurant });
  } catch (error) {
    console.error("Create restaurant error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
