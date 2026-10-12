import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSalesman } from "@/server/auth/rbac";
import { z } from "zod";

const updateCompanySchema = z.object({
  status: z.enum(["IN_PROGRESS", "NOT_PROGRESSING", "SUCCESS"]),
});

// PATCH — update a company's pipeline status. Companies are shared master
// data (not owned by one salesman), so any salesman may update the status
// of any company — matching the existing GET/POST routes' scoping.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSalesman();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateCompanySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const existing = await db.company.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Company not found" }, { status: 404 });
    }

    const company = await db.company.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    return NextResponse.json({ ok: true, data: company });
  } catch (error) {
    console.error("Update company status error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
