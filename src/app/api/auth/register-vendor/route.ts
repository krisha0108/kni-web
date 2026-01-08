import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { registerVendorSchema } from "@/server/validators/auth";
import { createSession } from "@/server/auth/session";
import { Role, VendorApprovalStatus } from "@prisma/client";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerVendorSchema.safeParse(body);

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

    // Create user with vendor profile (pending approval)
    const user = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: Role.VENDOR,
        isActive: true,
        vendorProfile: {
          create: {
            approvalStatus: VendorApprovalStatus.PENDING,
          },
        },
      },
    });

    // Create notification for vendor
    await db.notification.create({
      data: {
        userId: user.id,
        title: "Registration Complete",
        message: "Your vendor registration is pending approval.",
        linkUrl: "/vendor/pending",
      },
    });

    // Notify admins about new vendor registration
    const admins = await db.user.findMany({
      where: { role: Role.ADMIN, isActive: true },
    });

    await db.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: "New Vendor Registration",
        message: `${name} has registered as a vendor and is awaiting approval.`,
        linkUrl: "/admin/vendors",
      })),
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
        redirectUrl: "/vendor/pending",
      },
    });
  } catch (error) {
    console.error("Register vendor error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
