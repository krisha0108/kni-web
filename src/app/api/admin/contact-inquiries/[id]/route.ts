import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

// PATCH — mark a contact inquiry read/unread.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    if (typeof body.isRead !== "boolean") {
      return NextResponse.json({ ok: false, error: "isRead must be a boolean" }, { status: 400 });
    }

    const inquiry = await db.contactInquiry.update({
      where: { id },
      data: { isRead: body.isRead },
    });

    return NextResponse.json({ ok: true, data: inquiry });
  } catch (error) {
    console.error("Update contact inquiry error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE — remove a contact inquiry.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await db.contactInquiry.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete contact inquiry error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
