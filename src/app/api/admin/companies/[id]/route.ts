import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

// GET — one company's full detail: contacts + every inquiry/visit linked to it.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const company = await db.company.findUnique({
      where: { id },
      include: {
        createdBySalesman: { select: { id: true, name: true } },
        contacts: { orderBy: { isPrimary: "desc" } },
        inquiries: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            status: true,
            priority: true,
            source: true,
            createdAt: true,
            assignedSalesman: { select: { id: true, name: true } },
          },
        },
        visits: {
          orderBy: { visitDate: "desc" },
          include: { salesman: { select: { id: true, name: true } } },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ ok: false, error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: company });
  } catch (error) {
    console.error("Get company error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

const ALLOWED_FIELDS = ["name", "address", "city", "gstNumber", "website"] as const;

// PATCH — edit company master fields.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    const company = await db.company.update({ where: { id }, data: updateData });

    return NextResponse.json({ ok: true, data: company });
  } catch (error) {
    console.error("Update company error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE — remove a company. Linked inquiries/visits keep their existing
// free-text fields (they were always the source of truth for display) and
// just lose the companyId link (onDelete: SetNull in the schema).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await db.company.delete({ where: { id } });

    return NextResponse.json({ ok: true, message: "Company deleted. Linked inquiries and visits were kept, just unlinked." });
  } catch (error) {
    console.error("Delete company error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
