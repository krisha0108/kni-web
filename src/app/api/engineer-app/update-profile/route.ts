import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";

/**
 * POST /api/engineer-app/update-profile
 * Update engineer profile with support for multipart form data (photo upload)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireEngineerMobile(request);

    // Check content type
    const contentType = request.headers.get("content-type") || "";

    let name: string | undefined;
    let location: string | undefined;
    let removePhoto = false;
    // let profilePhotoFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData
      const formData = await request.formData();
      name = formData.get("full_name")?.toString() || formData.get("name")?.toString();
      location = formData.get("region")?.toString() || formData.get("location")?.toString();
      removePhoto = formData.get("remove_photo") === "1";
      // profilePhotoFile = formData.get("profile_photo") as File | null;

      // TODO: Handle profile photo upload to storage service
      // For now, we'll skip photo upload and just update text fields
    } else {
      // Handle JSON
      const body = await request.json();
      name = body.full_name || body.name;
      location = body.region || body.location;
      removePhoto = body.remove_photo === "1" || body.remove_photo === true;
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: session.id },
      data: {
        ...(name && { name }),
      },
    });

    // Update or create engineer profile
    if (location !== undefined) {
      await db.engineerProfile.upsert({
        where: { userId: session.id },
        update: {
          city: location || null,
        },
        create: {
          userId: session.id,
          city: location || null,
        },
      });
    }

    // Get updated profile
    const engineerProfile = await db.engineerProfile.findUnique({
      where: { userId: session.id },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        full_name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        profile_photo: null, // TODO: Return actual photo URL when implemented
        location: engineerProfile?.city || null,
        region: engineerProfile?.city || null,
      },
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
