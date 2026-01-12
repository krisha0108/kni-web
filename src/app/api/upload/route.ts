import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/cloudinary";
import { saveToLocalStorage } from "@/lib/local-storage";
import { getSession } from "@/server/auth/session";

// Check if Cloudinary is configured
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name";

export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "general";

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    let result;

    if (isCloudinaryConfigured) {
      // Upload to Cloudinary if configured
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const cloudinaryResult = await uploadImage(buffer, folder);
      result = {
        url: cloudinaryResult.url,
        public_id: cloudinaryResult.public_id,
      };
    } else {
      // Fall back to local storage
      console.log("Cloudinary not configured, using local storage");
      const localResult = await saveToLocalStorage(file, folder);
      result = {
        url: localResult.url,
        public_id: localResult.filename,
      };
    }

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
