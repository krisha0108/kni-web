import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const createRestaurantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits").optional(),
  fssaiNumber: z.string().optional(),
  fssaiCertificateUrl: z.string().optional(),
  restaurantImageUrl: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const restaurants = await db.restaurant.findMany({
      where: { ownerId: id, status: "APPROVED" },
      select: { id: true, name: true, address: true, city: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ ok: true, data: restaurants });
  } catch (error) {
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
    await requireAdmin();
    const { id: ownerId } = await params;

    // Verify owner exists
    const owner = await db.user.findFirst({
      where: { id: ownerId, role: "OWNER", deletedAt: null },
    });

    if (!owner) {
      return NextResponse.json(
        { ok: false, error: "Owner not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = createRestaurantSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, address, city, pincode, fssaiNumber, fssaiCertificateUrl, restaurantImageUrl } = validation.data;

    const restaurant = await db.restaurant.create({
      data: {
        ownerId,
        name,
        address,
        city,
        pincode: pincode || null,
        fssaiNumber: fssaiNumber || null,
        fssaiCertificateUrl: fssaiCertificateUrl || null,
        restaurantImageUrl: restaurantImageUrl || null,
        status: "APPROVED",
      },
      select: { id: true, name: true, address: true, city: true },
    });

    return NextResponse.json({ ok: true, data: restaurant }, { status: 201 });
  } catch (error) {
    console.error("Create restaurant error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
