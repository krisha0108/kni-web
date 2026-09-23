import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const salesman = await db.user.findUnique({
      where: { id, role: "SALESMAN" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        salesmanProfile: {
          select: { region: true },
        },
      },
    });

    if (!salesman) {
      return NextResponse.json({ ok: false, error: "Salesman not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: salesman });
  } catch (error) {
    console.error("Get salesman error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

const patchSalesmanSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().optional(),
  region: z.string().optional(),
});

// DELETE - Permanently delete salesman and all their data
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const salesman = await db.user.findFirst({
      where: { id, role: "SALESMAN", deletedAt: null },
      select: { id: true, name: true },
    });

    if (!salesman) {
      return NextResponse.json({ ok: false, error: "Salesman not found" }, { status: 404 });
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({
      ok: true,
      message: `Salesman "${salesman.name}" and all associated data permanently deleted.`,
    });
  } catch (error) {
    console.error("Delete salesman error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to delete salesman" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const validation = patchSalesmanSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { isActive, name, phone, region } = validation.data;

    const salesman = await db.user.findUnique({ where: { id, role: "SALESMAN" } });
    if (!salesman) {
      return NextResponse.json({ ok: false, error: "Salesman not found" }, { status: 404 });
    }

    const userUpdateData: Record<string, unknown> = {};
    if (isActive !== undefined) userUpdateData.isActive = isActive;
    if (name !== undefined) userUpdateData.name = name;
    if (phone !== undefined) userUpdateData.phone = phone;

    if (Object.keys(userUpdateData).length > 0) {
      await db.user.update({ where: { id }, data: userUpdateData });
    }

    if (region !== undefined) {
      await db.salesmanProfile.upsert({
        where: { userId: id },
        update: { region },
        create: { userId: id, region },
      });
    }

    const updatedSalesman = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        salesmanProfile: { select: { region: true } },
      },
    });

    return NextResponse.json({ ok: true, data: updatedSalesman });
  } catch (error) {
    console.error("Error updating salesman:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update salesman" },
      { status: 500 }
    );
  }
}
