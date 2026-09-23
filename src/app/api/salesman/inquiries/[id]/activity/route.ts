import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSalesman } from "@/server/auth/rbac";

// POST — add a note or log a call against one of the salesman's own
// inquiries. Mirrors the admin Launchpad "log a call" action, scoped to
// inquiries assigned to this salesman.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSalesman();
    const { id } = await params;
    const body = await request.json();

    const { kind, notes, callDate, duration, outcome } = body;

    if (!notes || typeof notes !== "string" || !notes.trim()) {
      return NextResponse.json({ ok: false, error: "Notes are required" }, { status: 400 });
    }

    const inquiry = await db.launchPadInquiry.findFirst({
      where: { id, assignedSalesmanId: session.id },
    });

    if (!inquiry) {
      return NextResponse.json({ ok: false, error: "Inquiry not found" }, { status: 404 });
    }

    const isCall = kind === "call";
    const durationStr = duration ? `${duration} min` : "";
    const description = isCall
      ? `Call logged by ${session.name}${durationStr ? ` (${durationStr})` : ""}${outcome ? ` — ${outcome}` : ""}`
      : `Note added by ${session.name}: ${notes.trim()}`;

    const activity = await db.launchPadActivityLog.create({
      data: {
        inquiryId: id,
        type: isCall ? "CALL_LOGGED" : "NOTE_ADDED",
        description,
        metadata: JSON.stringify({
          callDate: isCall ? callDate || new Date().toISOString() : undefined,
          duration: isCall ? duration || null : undefined,
          outcome: isCall ? outcome || null : undefined,
          notes: notes.trim(),
        }),
        performedBy: session.name,
      },
    });

    return NextResponse.json({ ok: true, data: activity });
  } catch (error) {
    console.error("Log salesman inquiry activity error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
