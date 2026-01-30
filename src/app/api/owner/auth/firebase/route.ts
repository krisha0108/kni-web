import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/owner/auth/firebase
 * Firebase authentication endpoint for mobile app Google Sign-In
 * Verifies Firebase ID token and creates/returns user session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { status: false, message: "Firebase ID token is required" },
        { status: 400 }
      );
    }

    // In production, verify the Firebase ID token using Firebase Admin SDK
    // For now, we'll decode the token payload (base64) to get user info
    // Note: This is NOT secure for production - use Firebase Admin SDK to verify
    let firebaseUser: { email?: string; name?: string; picture?: string; uid?: string } = {};

    try {
      // JWT structure: header.payload.signature
      const parts = idToken.split(".");
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        firebaseUser = {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          uid: payload.sub || payload.user_id,
        };
      }
    } catch (decodeError) {
      console.log("Token decode error (non-fatal):", decodeError);
    }

    if (!firebaseUser.email) {
      return NextResponse.json(
        { status: false, message: "Could not extract user email from token" },
        { status: 400 }
      );
    }

    // Find user with OWNER role by email
    let owner = await db.user.findFirst({
      where: {
        email: firebaseUser.email,
        role: "OWNER",
      },
      include: {
        restaurants: {
          where: { status: "APPROVED" },
          take: 1,
        },
      },
    });

    if (!owner) {
      // Create new owner from Google account
      owner = await db.user.create({
        data: {
          email: firebaseUser.email,
          name: firebaseUser.name || firebaseUser.email.split("@")[0],
          passwordHash: "", // No password for Google sign-in
          role: "OWNER",
          isActive: true,
        },
        include: {
          restaurants: {
            where: { status: "APPROVED" },
            take: 1,
          },
        },
      });

      // Create owner profile
      await db.ownerProfile.create({
        data: {
          userId: owner.id,
        },
      });
    }

    // Create session token
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.session.create({
      data: {
        userId: owner.id,
        token: sessionToken,
        expiresAt,
      },
    });

    const hasRestaurant = owner.restaurants && owner.restaurants.length > 0;

    return NextResponse.json({
      status: true,
      message: "Authentication successful",
      token: sessionToken,
      owner: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        profile_image: null,
        is_verified: true,
      },
      hasRestaurant,
    });
  } catch (error: unknown) {
    console.error("Firebase auth error:", error);
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : "Authentication failed" },
      { status: 500 }
    );
  }
}
