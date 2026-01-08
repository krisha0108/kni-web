import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { registerOwnerSchema } from "@/server/validators/auth";
import { createSession } from "@/server/auth/session";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerOwnerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = validation.data;

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with owner profile
    const user = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: Role.OWNER,
        isActive: true,
        ownerProfile: {
          create: {},
        },
      },
    });

    // Create welcome notification
    await db.notification.create({
      data: {
        userId: user.id,
        title: "Welcome to KNI Super App!",
        message: "Start by adding your restaurant details.",
        linkUrl: "/owner/restaurant/create",
      },
    });

    // Create session
    await createSession(user.id);

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        redirectUrl: "/owner/dashboard",
      },
    });
  } catch (error) {
    console.error("Register owner error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
