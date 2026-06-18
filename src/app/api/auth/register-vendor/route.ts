import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { registerVendorSchema } from "@/server/validators/auth";
import { Role, VendorApprovalStatus } from "@prisma/client";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerVendorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, city, state, categoryIds, areaIds, password } = validation.data;

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

    // Verify all category IDs exist and are active
    const categories = await db.marketplaceCategory.findMany({
      where: {
        id: { in: categoryIds },
        isActive: true,
        deletedAt: null,
      },
    });

    if (categories.length !== categoryIds.length) {
      return NextResponse.json(
        { ok: false, error: "One or more selected categories are invalid" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with vendor profile and category selections (pending approval)
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
            city,
            state,
            approvalStatus: VendorApprovalStatus.PENDING,
          },
        },
        vendorCategories: {
          create: categoryIds.map((categoryId) => ({
            categoryId,
          })),
        },
      },
    });

    // Create location requests if areaIds provided
    if (areaIds && areaIds.length > 0) {
      const validAreas = await db.serviceArea.findMany({
        where: { id: { in: areaIds }, isActive: true },
      });
      if (validAreas.length > 0) {
        await db.vendorLocationRequest.createMany({
          data: validAreas.map((area) => ({
            vendorId: user.id,
            areaId: area.id,
            status: "PENDING" as const,
          })),
        });
      }
    }

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

    // Do not create session - vendor must wait for admin approval before logging in
    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        message: "Registration successful! Your account is pending admin approval. You will be notified once approved.",
        redirectUrl: "/register-vendor/success",
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
