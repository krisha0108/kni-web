import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/server/db";
import { requireSalesman } from "@/server/auth/rbac";
import { sendLaunchPadResponseEmail } from "@/lib/email";

// GET — message thread for one of the salesman's own inquiries.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSalesman();
    const { id } = await params;

    const inquiry = await db.launchPadInquiry.findFirst({
      where: { id, assignedSalesmanId: session.id },
    });
    if (!inquiry) {
      return NextResponse.json({ ok: false, error: "Inquiry not found" }, { status: 404 });
    }

    const threads = await db.launchPadInquiryThread.findMany({
      where: { inquiryId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ ok: true, data: threads });
  } catch (error) {
    console.error("Get salesman inquiry threads error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// POST — salesman sends a message to their own inquiry's customer, same
// as the admin "Conversation Thread" feature: adds to the shared thread,
// optionally emails the customer with a link to their reply portal, and
// auto-advances NEW -> CONTACTED on first contact.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSalesman();
    const { id } = await params;
    const body = await request.json();

    const { subject, message, sendEmail } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ ok: false, error: "Message is required" }, { status: 400 });
    }

    const inquiry = await db.launchPadInquiry.findFirst({
      where: { id, assignedSalesmanId: session.id },
    });
    if (!inquiry) {
      return NextResponse.json({ ok: false, error: "Inquiry not found" }, { status: 404 });
    }

    const thread = await db.launchPadInquiryThread.create({
      data: {
        inquiryId: id,
        message: message.trim(),
        subject: subject?.trim() || null,
        isAdmin: true,
      },
    });

    if (sendEmail) {
      let accessToken = inquiry.accessToken;
      if (!accessToken) {
        accessToken = crypto.randomBytes(32).toString("hex");
        await db.launchPadInquiry.update({ where: { id }, data: { accessToken } });
      }

      const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/inquiry/${accessToken}`;

      await sendLaunchPadResponseEmail(
        inquiry.email,
        inquiry.name,
        inquiry.businessType,
        subject?.trim() || "Update on Your Inquiry",
        message.trim(),
        session.name,
        portalUrl,
      );

      await db.launchPadActivityLog.create({
        data: {
          inquiryId: id,
          type: "EMAIL_SENT",
          description: `Email sent to ${inquiry.email}${subject ? ` — "${subject.trim()}"` : ""}`,
          metadata: JSON.stringify({ subject: subject?.trim() || null, to: inquiry.email }),
          performedBy: session.name,
        },
      });
    }

    if (inquiry.status === "NEW") {
      await db.launchPadInquiry.update({ where: { id }, data: { status: "CONTACTED" } });
      await db.launchPadActivityLog.create({
        data: {
          inquiryId: id,
          type: "STATUS_CHANGED",
          description: `Status changed from NEW to CONTACTED (auto)`,
          metadata: JSON.stringify({ from: "NEW", to: "CONTACTED", auto: true }),
          performedBy: session.name,
        },
      });
    }

    return NextResponse.json({ ok: true, data: thread });
  } catch (error) {
    console.error("Create salesman inquiry thread error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
