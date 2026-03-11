import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/cloudinary";
import { saveToLocalStorage } from "@/lib/local-storage";
import { getMobileSession } from "@/server/auth/mobile-session";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name";

// POST /api/upload-document - Upload document (images + PDF)
export async function POST(req: NextRequest) {
  try {
    const session = await getMobileSession(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "documents";

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Only images (JPEG, PNG, WebP) and PDF files are allowed" },
        { status: 400 }
      );
    }

    // Max 10MB for documents
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    let result;

    if (isCloudinaryConfigured && file.type.startsWith("image/")) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const cloudinaryResult = await uploadImage(buffer, folder);
      result = { url: cloudinaryResult.url, public_id: cloudinaryResult.public_id };
    } else {
      // Local storage for PDFs or when Cloudinary not configured
      const localResult = await saveToLocalStorage(file, folder);
      result = { url: localResult.url, public_id: localResult.filename };
    }

    return NextResponse.json({
      ok: true,
      url: result.url,
      data: result,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
