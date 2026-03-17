import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate token format
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json(
        { ok: false, error: "Invalid token" },
        { status: 400 }
      );
    }

    const inquiry = await db.launchPadInquiry.findUnique({
      where: { accessToken: token },
    });

    if (!inquiry) {
      return NextResponse.json(
        { ok: false, error: "Inquiry not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { ok: false, error: "Message is required" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { ok: false, error: "Message must be under 2000 characters" },
        { status: 400 }
      );
    }

    // Rate limit: 10 replies per token per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentReplies = await db.launchPadInquiryThread.count({
      where: {
        inquiryId: inquiry.id,
        isAdmin: false,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentReplies >= 10) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const thread = await db.launchPadInquiryThread.create({
      data: {
        inquiryId: inquiry.id,
        message: message.trim(),
        isAdmin: false,
      },
    });

    // Log CUSTOMER_REPLY activity
    await db.launchPadActivityLog.create({
      data: {
        inquiryId: inquiry.id,
        type: "CUSTOMER_REPLY",
        description: `Customer replied via portal`,
        performedBy: inquiry.name,
      },
    });

    return NextResponse.json({ ok: true, data: thread });
  } catch (error) {
    console.error("Customer portal reply error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
