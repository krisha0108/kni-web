import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

// GET — all landing-page contact form submissions, newest first.
export async function GET() {
  try {
    await requireAdmin();

    const inquiries = await db.contactInquiry.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: inquiries });
  } catch (error) {
    console.error("Get contact inquiries error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
