import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { uploadImage, uploadVideo } from "@/lib/cloudinary";
import { saveToLocalStorage } from "@/lib/local-storage";

const ALLOWED_DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 60 * 1024 * 1024; // 60MB (client enforces ~2 min recording length)

const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name";

// Single-value document fields on Candidate
const SINGLE_DOC_FIELDS = new Set([
  "aadhaar",
  "pan",
  "resume",
  "photo",
  "salarySlip",
  "policeVerification",
  "vaccinationCert",
  "drivingLicense",
]);
const SINGLE_DOC_COLUMN: Record<string, string> = {
  aadhaar: "aadhaarUrl",
  pan: "panUrl",
  resume: "resumeUrl",
  photo: "photoUrl",
  salarySlip: "salarySlipUrl",
  policeVerification: "policeVerificationUrl",
  vaccinationCert: "vaccinationCertUrl",
  drivingLicense: "drivingLicenseUrl",
};

// Multi-value (array) document fields on Candidate
const ARRAY_DOC_COLUMN: Record<string, string> = {
  experienceCert: "experienceCertUrls",
  educationCert: "educationCertUrls",
};

// POST /api/public/candidate-upload - upload a candidate's document/photo/video (no auth; public registration flow)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const candidateId = formData.get("candidateId") as string;
    const docType = formData.get("docType") as string;

    if (!file || !candidateId || !docType) {
      return NextResponse.json(
        { ok: false, error: "file, candidateId and docType are required" },
        { status: 400 }
      );
    }

    const candidate = await db.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) {
      return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
    }

    const isVideo = docType === "video";

    if (isVideo) {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        return NextResponse.json(
          { ok: false, error: "Only MP4, WebM or MOV videos are allowed" },
          { status: 400 }
        );
      }
      if (file.size > MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { ok: false, error: "Video must be under 60MB (keep the intro to ~1-2 minutes)" },
          { status: 400 }
        );
      }
    } else {
      if (!SINGLE_DOC_FIELDS.has(docType) && !ARRAY_DOC_COLUMN[docType]) {
        return NextResponse.json({ ok: false, error: "Invalid docType" }, { status: 400 });
      }
      if (!ALLOWED_DOC_TYPES.includes(file.type)) {
        return NextResponse.json(
          { ok: false, error: "Only images (JPEG, PNG, WebP) and PDF files are allowed" },
          { status: 400 }
        );
      }
      if (file.size > MAX_DOC_SIZE) {
        return NextResponse.json(
          { ok: false, error: "File size must be less than 10MB" },
          { status: 400 }
        );
      }
    }

    let url: string;

    if (isVideo) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      if (isCloudinaryConfigured) {
        const result = await uploadVideo(buffer, "candidate-videos");
        url = result.url;
      } else {
        const result = await saveToLocalStorage(file, "candidate-videos");
        url = result.url;
      }
    } else if (isCloudinaryConfigured && file.type.startsWith("image/")) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const result = await uploadImage(buffer, "candidate-documents");
      url = result.url;
    } else {
      const result = await saveToLocalStorage(file, "candidate-documents");
      url = result.url;
    }

    if (isVideo) {
      await db.candidate.update({ where: { id: candidateId }, data: { videoIntroUrl: url } });
    } else if (ARRAY_DOC_COLUMN[docType]) {
      const column = ARRAY_DOC_COLUMN[docType] as "experienceCertUrls" | "educationCertUrls";
      const existing = Array.isArray(candidate[column]) ? (candidate[column] as string[]) : [];
      await db.candidate.update({
        where: { id: candidateId },
        data: { [column]: [...existing, url] },
      });
    } else {
      const column = SINGLE_DOC_COLUMN[docType];
      await db.candidate.update({ where: { id: candidateId }, data: { [column]: url } });
    }

    return NextResponse.json({ ok: true, url, data: { url, docType } });
  } catch (error) {
    console.error("Candidate upload error:", error);
    return NextResponse.json({ ok: false, error: "Failed to upload file" }, { status: 500 });
  }
}
