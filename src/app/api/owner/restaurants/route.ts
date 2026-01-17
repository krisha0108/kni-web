import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { notifyAdminsNewRestaurantRequest } from "@/server/notifications/service";
import { z } from "zod";

// Helper to validate image URLs (accepts full URLs or relative paths like /uploads/...)
const imageUrlSchema = z.string().refine(
  (val) => !val || val.startsWith("/") || val.startsWith("http://") || val.startsWith("https://"),
  { message: "Invalid image URL" }
);

const createRestaurantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  pincode: z.string().min(6, "Pincode must be 6 digits").max(6, "Pincode must be 6 digits").optional(),
  restaurantImageUrl: imageUrlSchema.optional().or(z.literal("")),
  fssaiNumber: z.string().min(14, "FSSAI number must be 14 digits").max(14, "FSSAI number must be 14 digits"),
  fssaiCertificateUrl: imageUrlSchema,
});

export async function GET() {
  try {
    const session = await requireOwner();

    // Return all restaurants for this owner
    const restaurants = await db.restaurant.findMany({
      where: { ownerId: session.id },
      orderBy: { createdAt: "desc" },
      include: {
        categories: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ ok: true, data: restaurants });
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
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const restaurant = await db.restaurant.create({
      data: {
        name: validation.data.name,
        address: validation.data.address,
        city: validation.data.city,
        pincode: validation.data.pincode,
        restaurantImageUrl: validation.data.restaurantImageUrl || null,
        fssaiNumber: validation.data.fssaiNumber,
        fssaiCertificateUrl: validation.data.fssaiCertificateUrl,
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
