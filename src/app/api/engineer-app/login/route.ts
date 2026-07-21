import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createSession } from "@/server/auth/session";
import bcrypt from "bcrypt";
import { z } from "zod";

const engineerLoginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  password: z.string().min(1, "Password is required"),
  device_type: z.string().optional(),
  app_version: z.string().optional(),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone is required",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = engineerLoginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, phone, password } = validation.data;

    // Find user by email or phone
    const user = await db.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
      include: {
        engineerProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if user is an engineer
    if (user.role !== "ENGINEER") {
      return NextResponse.json(
        { ok: false, error: "Access denied. This app is for service engineers only." },
        { status: 403 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { ok: false, error: "Your account has been deactivated. Please contact support." },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create session and get the token
    const sessionToken = await createSession(user.id);

    return NextResponse.json({
      ok: true,
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        city: user.engineerProfile?.city || null,
        skills: user.engineerProfile?.skills || null,
        availability: user.isAvailable,
      },
    });
  } catch (error) {
    console.error("Engineer login error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
