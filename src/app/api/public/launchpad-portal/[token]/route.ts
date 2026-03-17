import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate token format (64 hex chars)
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json(
        { ok: false, error: "Invalid token" },
        { status: 400 }
      );
    }

    const inquiry = await db.launchPadInquiry.findUnique({
      where: { accessToken: token },
      include: {
        threads: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!inquiry) {
      return NextResponse.json(
        { ok: false, error: "Inquiry not found" },
        { status: 404 }
      );
    }

    // Return limited fields only — do NOT expose phone, adminNotes, priority, followUpDate
    return NextResponse.json({
      ok: true,
      data: {
        name: inquiry.name,
        email: inquiry.email,
        businessType: inquiry.businessType,
        businessName: inquiry.businessName,
        status: inquiry.status,
        createdAt: inquiry.createdAt,
        threads: inquiry.threads,
      },
    });
  } catch (error) {
    console.error("Get launchpad portal error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
