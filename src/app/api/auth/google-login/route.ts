import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createSession } from "@/server/auth/session";
import { z } from "zod";

const googleLoginSchema = z.object({
  firebaseUid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = googleLoginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { firebaseUid, email, displayName, photoURL } = validation.data;

    // Find or create user
    let user = await db.user.findFirst({
      where: {
        OR: [
          { email },
          { phone: firebaseUid }, // Store Firebase UID in phone field temporarily
        ],
      },
      include: {
        restaurants: {
          where: { status: "APPROVED" },
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            pincode: true,
            restaurantImageUrl: true,
            fssaiNumber: true,
            status: true,
          },
        },
      },
    });

    // Create new user if doesn't exist
    if (!user) {
      // Extract first and last name from displayName
      const nameParts = (displayName || email.split("@")[0]).split(" ");
      const firstName = nameParts[0] || "User";
      const lastName = nameParts.slice(1).join(" ") || "";
      const fullName = `${firstName} ${lastName}`.trim();

      user = await db.user.create({
        data: {
          name: fullName,
          email,
          phone: firebaseUid, // Store Firebase UID temporarily
          passwordHash: "", // No password for OAuth users
          role: "OWNER",
          isActive: true,
        },
        include: {
          restaurants: {
            where: { status: "APPROVED" },
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              pincode: true,
              restaurantImageUrl: true,
              fssaiNumber: true,
              status: true,
            },
          },
        },
      });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { ok: false, error: "Account is inactive" },
        { status: 403 }
      );
    }

    // Create session
    await createSession(user.id);

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        restaurants: user.restaurants,
        hasApprovedRestaurant: user.restaurants.length > 0,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
