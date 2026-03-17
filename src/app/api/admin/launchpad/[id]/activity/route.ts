import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const activities = await db.launchPadActivityLog.findMany({
      where: { inquiryId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: activities });
  } catch (error) {
    console.error("Get launchpad activities error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// POST — Log a call
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const { callDate, duration, notes, outcome } = body;

    if (!notes || typeof notes !== "string" || !notes.trim()) {
      return NextResponse.json(
        { ok: false, error: "Call notes are required" },
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

    const adminUser = await db.user.findUnique({
      where: { id: admin.id },
      select: { name: true },
    });

    const adminName = adminUser?.name || "Admin";
    const durationStr = duration ? `${duration} min` : "";
    const description = `Call logged by ${adminName}${durationStr ? ` (${durationStr})` : ""}${outcome ? ` — ${outcome}` : ""}`;

    const activity = await db.launchPadActivityLog.create({
      data: {
        inquiryId: id,
        type: "CALL_LOGGED",
        description,
        metadata: JSON.stringify({
          callDate: callDate || new Date().toISOString(),
          duration: duration || null,
          notes: notes.trim(),
          outcome: outcome || null,
        }),
        performedBy: adminName,
      },
    });

    return NextResponse.json({ ok: true, data: activity });
  } catch (error) {
    console.error("Log call error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
