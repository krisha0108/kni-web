import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { sendLaunchPadResponseEmail } from "@/lib/email";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const threads = await db.launchPadInquiryThread.findMany({
      where: { inquiryId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ ok: true, data: threads });
  } catch (error) {
    console.error("Get launchpad threads error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const { subject, message, sendEmail } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { ok: false, error: "Message is required" },
        { status: 400 }
      );
    }

    const inquiry = await db.launchPadInquiry.findUnique({
      where: { id },
    });

    if (!inquiry) {
      return NextResponse.json(
        { ok: false, error: "Inquiry not found" },
        { status: 404 }
      );
    }

    // Create thread message
    const thread = await db.launchPadInquiryThread.create({
      data: {
        inquiryId: id,
        message: message.trim(),
        subject: subject?.trim() || null,
        isAdmin: true,
      },
    });

    const adminUser = await db.user.findUnique({
      where: { id: admin.id },
      select: { name: true },
    });
    const adminName = adminUser?.name || "Admin";

    // Send email if requested
    if (sendEmail) {
      // Generate access token if not exists
      let accessToken = inquiry.accessToken;
      if (!accessToken) {
        accessToken = crypto.randomBytes(32).toString("hex");
        await db.launchPadInquiry.update({
          where: { id },
          data: { accessToken },
        });
      }

      const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/inquiry/${accessToken}`;

      await sendLaunchPadResponseEmail(
        inquiry.email,
        inquiry.name,
        inquiry.businessType,
        subject?.trim() || "Update on Your Inquiry",
        message.trim(),
        adminName,
        portalUrl,
      );

      // Log EMAIL_SENT activity
      await db.launchPadActivityLog.create({
        data: {
          inquiryId: id,
          type: "EMAIL_SENT",
          description: `Email sent to ${inquiry.email}${subject ? ` — "${subject.trim()}"` : ""}`,
          metadata: JSON.stringify({ subject: subject?.trim() || null, to: inquiry.email }),
          performedBy: adminName,
        },
      });
    }

    // Auto-update status NEW → CONTACTED
    if (inquiry.status === "NEW") {
      await db.launchPadInquiry.update({
        where: { id },
        data: { status: "CONTACTED" },
      });

      // Log status change activity
      await db.launchPadActivityLog.create({
        data: {
          inquiryId: id,
          type: "STATUS_CHANGED",
          description: `Status changed from NEW to CONTACTED (auto)`,
          metadata: JSON.stringify({ from: "NEW", to: "CONTACTED", auto: true }),
          performedBy: adminName,
        },
      });
    }

    return NextResponse.json({ ok: true, data: thread });
  } catch (error) {
    console.error("Create launchpad thread error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
