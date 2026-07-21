import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * GET /api/engineer-app/profile
 * Get engineer profile data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    // Get user with engineer profile
    const user = await db.user.findUnique({
      where: { id: session.id },
      include: {
        engineerProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get engineer stats
    const [completedJobs, totalRatings, avgRating] = await Promise.all([
      db.engineerAssignment.count({
        where: {
          engineerId: session.id,
          status: "COMPLETED",
        },
      }),
      db.engineerRating.count({
        where: {
          engineerId: session.id,
          isPublished: true,
        },
      }),
      db.engineerRating.aggregate({
        where: {
          engineerId: session.id,
          isPublished: true,
        },
        _avg: {
          overallRating: true,
        },
      }),
    ]);

    // Calculate success rate
    const totalAssignments = await db.engineerAssignment.count({
      where: { engineerId: session.id },
    });
    const successRate = totalAssignments > 0
      ? Math.round((completedJobs / totalAssignments) * 100)
      : 0;

    return NextResponse.json({
      ok: true,
      id: user.id,
      name: user.name,
      full_name: user.name,
      email: user.email,
      phone: user.phone,
      profile_photo: null,
      avatar: null,
      location: user.engineerProfile?.city || null,
      region: user.engineerProfile?.city || null,
      specialization: user.engineerProfile?.skills || null,
      expertise_level: user.engineerProfile?.skills || null,
      experience: null,
      rating: avgRating._avg.overallRating || 0,
      completed_jobs: completedJobs,
      success_rate: `${successRate}%`,
      total_ratings: totalRatings,
      created_at: user.createdAt.toISOString(),
      availability: user.isAvailable,
    });
  } catch (error) {
    console.error("Get engineer profile error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

/**
 * PUT /api/engineer-app/profile
 * Update engineer profile
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);
    const body = await request.json();

    const { name, phone, city, skills, availability } = body;

    // Update user
    const updatedUser = await db.user.update({
      where: { id: session.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(typeof availability === "boolean" && { isAvailable: availability }),
      },
    });

    // Update or create engineer profile
    if (city || skills) {
      await db.engineerProfile.upsert({
        where: { userId: session.id },
        update: {
          ...(city && { city }),
          ...(skills && { skills }),
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
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update engineer profile error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
