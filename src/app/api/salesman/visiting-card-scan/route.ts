import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/cloudinary";
import { saveToLocalStorage } from "@/lib/local-storage";
import { extractTextFromImage, parseCardFields } from "@/lib/ocr";
import { requireSalesman } from "@/server/auth/rbac";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name";

// POST /api/salesman/visiting-card-scan — upload a front/back visiting card
// photo, save it, and run local OCR on it. Returns the photo URL plus
// whichever fields could be reliably extracted (see src/lib/ocr.ts for why
// only some fields are auto-filled).
export async function POST(req: NextRequest) {
  try {
    await requireSalesman();

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const side = (formData.get("side") as string) || "front";

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Only JPEG, PNG or WebP images are allowed" },
        { status: 400 }
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "File size must be less than 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Storing the photo and OCR-reading it are independent of each other —
    // run them side by side instead of one after the other, since OCR
    // (especially a cold worker) is the slow part and was otherwise making
    // the salesman wait for the image upload to finish first for no reason.
    const [uploadResult, rawText] = await Promise.all([
      isCloudinaryConfigured
        ? uploadImage(buffer, "visiting-cards")
        : saveToLocalStorage(file, "visiting-cards"),
      extractTextFromImage(buffer),
    ]);
    const url = uploadResult.url;
    const parsed = parseCardFields(rawText);

    return NextResponse.json({ ok: true, data: { url, side, ...parsed } });
  } catch (error) {
    console.error("Visiting card scan error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to scan visiting card" },
      { status: 500 }
    );
  }
}
