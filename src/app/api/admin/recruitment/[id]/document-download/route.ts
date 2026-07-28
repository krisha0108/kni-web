import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

function extOf(url: string): string {
  const clean = url.split("?")[0];
  const ext = path.extname(clean).toLowerCase();
  return ext || "";
}

function sanitizeFilenamePart(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-") || "file";
}

/**
 * GET /api/admin/recruitment/[id]/document-download?url=<candidate-doc-url>&name=<label>
 * Force-downloads a candidate document/video regardless of storage backend
 * (Cloudinary in production, local /uploads/ in dev). The requested `url` must
 * match one of this candidate's own document fields — prevents this route
 * being used as an open URL-fetch proxy.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const name = searchParams.get("name") || "document";

    if (!url) {
      return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 });
    }

    const candidate = await db.candidate.findUnique({
      where: { id },
      select: {
        fullName: true,
        photoUrl: true,
        aadhaarUrl: true,
        panUrl: true,
        resumeUrl: true,
        drivingLicenseUrl: true,
        salarySlipUrl: true,
        policeVerificationUrl: true,
        vaccinationCertUrl: true,
        videoIntroUrl: true,
        experienceCertUrls: true,
        educationCertUrls: true,
      },
    });

    if (!candidate) {
      return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
    }

    const allowedUrls = new Set(
      [
        candidate.photoUrl,
        candidate.aadhaarUrl,
        candidate.panUrl,
        candidate.resumeUrl,
        candidate.drivingLicenseUrl,
        candidate.salarySlipUrl,
        candidate.policeVerificationUrl,
        candidate.vaccinationCertUrl,
        candidate.videoIntroUrl,
        ...(Array.isArray(candidate.experienceCertUrls) ? (candidate.experienceCertUrls as string[]) : []),
        ...(Array.isArray(candidate.educationCertUrls) ? (candidate.educationCertUrls as string[]) : []),
      ].filter(Boolean)
    );

    if (!allowedUrls.has(url)) {
      return NextResponse.json(
        { ok: false, error: "This document does not belong to this candidate" },
        { status: 403 }
      );
    }

    const ext = extOf(url);
    const contentType = MIME_BY_EXT[ext] || "application/octet-stream";
    const filename = `${sanitizeFilenamePart(candidate.fullName)}-${sanitizeFilenamePart(name)}${ext}`;

    let buffer: Buffer;

    if (url.startsWith("/uploads/")) {
      if (url.includes("..") || url.includes("\\")) {
        return NextResponse.json({ ok: false, error: "Invalid file path" }, { status: 400 });
      }
      const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
      const filePath = path.resolve(process.cwd(), "public", url.replace(/^\//, ""));
      if (!filePath.startsWith(uploadsDir)) {
        return NextResponse.json({ ok: false, error: "Invalid file path" }, { status: 400 });
      }
      buffer = await fs.readFile(filePath);
    } else if (/^https:\/\/res\.cloudinary\.com\//.test(url)) {
      const upstream = await fetch(url);
      if (!upstream.ok) {
        return NextResponse.json({ ok: false, error: "Failed to fetch document" }, { status: 502 });
      }
      buffer = Buffer.from(await upstream.arrayBuffer());
    } else {
      return NextResponse.json({ ok: false, error: "Unsupported document URL" }, { status: 400 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Document download error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
