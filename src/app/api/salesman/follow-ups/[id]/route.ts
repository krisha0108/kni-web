import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSalesman } from "@/server/auth/rbac";
import { z } from "zod";

const updateFollowUpSchema = z.object({
  followUpDate: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  isDone: z.boolean().optional(),
});

// PATCH — mark done, or reschedule (date/note), one's own follow-up only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSalesman();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateFollowUpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const existing = await db.salesmanFollowUp.findFirst({
      where: { id, salesmanId: session.id },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Follow-up not found" }, { status: 404 });
    }

    const { followUpDate, note, isDone } = parsed.data;
    const followUp = await db.salesmanFollowUp.update({
      where: { id },
      data: {
        ...(followUpDate !== undefined ? { followUpDate: new Date(followUpDate) } : {}),
        ...(note !== undefined ? { note } : {}),
        ...(isDone !== undefined ? { isDone } : {}),
      },
      include: {
        inquiry: { select: { id: true, name: true, businessName: true } },
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, data: followUp });
  } catch (error) {
    console.error("Update salesman follow-up error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE — cancel one's own follow-up.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSalesman();
    const { id } = await params;

    const existing = await db.salesmanFollowUp.findFirst({
      where: { id, salesmanId: session.id },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Follow-up not found" }, { status: 404 });
    }

    await db.salesmanFollowUp.delete({ where: { id } });

    return NextResponse.json({ ok: true, data: { id } });
  } catch (error) {
    console.error("Delete salesman follow-up error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
