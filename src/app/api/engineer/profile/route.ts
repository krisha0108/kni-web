import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== Role.ENGINEER) {
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
        isAvailable: true,
        engineerProfile: {
          select: {
            city: true,
            skills: true,
          },
        },
        engineerAssignments: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // Calculate stats
    const totalJobs = user.engineerAssignments.length;
    const completedJobs = user.engineerAssignments.filter(
      (a) => a.status === "COMPLETED"
    ).length;

    // Get average rating from engineer ratings
    const ratingsResult = await db.engineerRating.aggregate({
      where: { engineerId: session.id },
      _avg: { overallRating: true },
    });

    const { engineerAssignments, ...userData } = user;

    return NextResponse.json({
      ok: true,
      data: {
        ...userData,
        stats: {
          totalJobs,
          completedJobs,
          avgRating: ratingsResult._avg?.overallRating || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching engineer profile:", error);
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

    if (session.role !== Role.ENGINEER) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, city, skills, isAvailable } = body;

    // Update user data
    const updateData: { name?: string; email?: string; phone?: string; isAvailable?: boolean } = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (typeof isAvailable === "boolean") updateData.isAvailable = isAvailable;

    const updatedUser = await db.user.update({
      where: { id: session.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isAvailable: true,
      },
    });

    // Update or create engineer profile
    if (city !== undefined || skills !== undefined) {
      await db.engineerProfile.upsert({
        where: { userId: session.id },
        update: {
          ...(city !== undefined && { city }),
          ...(skills !== undefined && { skills }),
        },
        create: {
          userId: session.id,
          city: city || null,
          skills: skills || null,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating engineer profile:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
