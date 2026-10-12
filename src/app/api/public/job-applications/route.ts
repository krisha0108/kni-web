import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { uploadImage } from "@/lib/cloudinary";
import { saveToLocalStorage } from "@/lib/local-storage";
import { z } from "zod";

const ALLOWED_DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name";

const applicationSchema = z.object({
  jobPositionId: z.string().min(1, "jobPositionId is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(7, "Phone must be at least 7 digits"),
  message: z.string().max(5000).optional(),
});

// POST /api/public/job-applications - submit an application for a (non-Technician) JobPosition.
// No auth - this is a public careers-page form.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const validation = applicationSchema.safeParse({
      jobPositionId: formData.get("jobPositionId"),
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      message: formData.get("message") || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { jobPositionId, name, email, phone, message } = validation.data;

    const position = await db.jobPosition.findUnique({ where: { id: jobPositionId } });
    if (!position || position.deletedAt || !position.isActive) {
      return NextResponse.json(
        { ok: false, error: "This position is no longer accepting applications" },
        { status: 400 }
      );
    }
    if (position.externalApplyUrl) {
      return NextResponse.json(
        { ok: false, error: "This position uses a different application process" },
        { status: 400 }
      );
    }

    // Rate limit: max 3 submissions per email per 24 hours (same policy as /api/public/launchpad-inquiry)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await db.jobApplication.count({
      where: { email, createdAt: { gte: twentyFourHoursAgo } },
    });
    if (recentCount >= 3) {
      return NextResponse.json(
        { ok: false, error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    let resumeUrl: string | null = null;
    const resume = formData.get("resume") as File | null;
    if (resume && resume.size > 0) {
      if (!ALLOWED_DOC_TYPES.includes(resume.type)) {
        return NextResponse.json(
          { ok: false, error: "Resume must be a PDF, JPEG, PNG or WebP file" },
          { status: 400 }
        );
      }
      if (resume.size > MAX_DOC_SIZE) {
        return NextResponse.json(
          { ok: false, error: "Resume file size must be less than 10MB" },
          { status: 400 }
        );
      }

      if (isCloudinaryConfigured && resume.type.startsWith("image/")) {
        const bytes = await resume.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const result = await uploadImage(buffer, "job-applications");
        resumeUrl = result.url;
      } else {
        const result = await saveToLocalStorage(resume, "job-applications");
        resumeUrl = result.url;
      }
    }

    const application = await db.jobApplication.create({
      data: { jobPositionId, name, email, phone, message: message || null, resumeUrl },
    });

    return NextResponse.json({ ok: true, data: { id: application.id } }, { status: 201 });
  } catch (error) {
    console.error("Job application submission error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
