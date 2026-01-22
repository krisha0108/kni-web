import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { Role, CoverageType } from "@prisma/client";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== Role.VENDOR) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const user = await db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        vendorProfile: {
          select: {
            approvalStatus: true,
            approvalNote: true,
            rejectionReason: true,
            subscriptionStatus: true,
            trialEndsAt: true,
            activeUntil: true,
          },
        },
        vendorCoverage: {
          select: {
            coverageType: true,
            cities: true,
            pincodes: true,
          },
        },
        vendorProducts: {
          select: { id: true },
        },
        vendorOrders: {
          select: { id: true },
        },
        vendorRatingsReceived: {
          select: { overallRating: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // Calculate stats
    const totalProducts = user.vendorProducts.length;
    const totalOrders = user.vendorOrders.length;
    const ratings = user.vendorRatingsReceived;
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum: number, r: { overallRating: number }) => sum + r.overallRating, 0) / ratings.length
      : 0;

    const { vendorProducts, vendorOrders, vendorRatingsReceived, ...userData } = user;

    return NextResponse.json({
      ok: true,
      data: {
        ...userData,
        stats: {
          totalProducts,
          totalOrders,
          avgRating,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching vendor profile:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== Role.VENDOR) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, coverageType, cities, pincodes } = body;

    // Update user data
    const updateData: { name?: string; email?: string; phone?: string } = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;

    const updatedUser = await db.user.update({
      where: { id: session.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    // Update or create vendor coverage
    if (coverageType) {
      await db.vendorCoverage.upsert({
        where: { vendorId: session.id },
        update: {
          coverageType: coverageType as CoverageType,
          cities: coverageType === "CITY" ? cities : null,
          pincodes: coverageType === "PINCODE" ? pincodes : null,
        },
        create: {
          vendorId: session.id,
          coverageType: coverageType as CoverageType,
          cities: coverageType === "CITY" ? cities : null,
          pincodes: coverageType === "PINCODE" ? pincodes : null,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating vendor profile:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
