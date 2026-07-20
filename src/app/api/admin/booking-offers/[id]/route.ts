import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  discountPercent: z.number().int().min(1).max(100).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
  code: z.string().trim().min(3).max(40).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  onePerOwner: z.boolean().optional(),
  imageUrl: z.string().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

/**
 * PATCH /api/admin/booking-offers/[id]
 * Update or pause/resume an offer
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { name, discountPercent, startDate, endDate, isActive, code, categoryId, maxRedemptions, onePerOwner, imageUrl, description, sortOrder } = validation.data;

    const existing = await db.bookingOffer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Offer not found" }, { status: 404 });
    }

    const normalizedCode = code ? code.toUpperCase() : code;
    if (normalizedCode) {
      const codeOwner = await db.bookingOffer.findUnique({ where: { code: normalizedCode } });
      if (codeOwner && codeOwner.id !== id) {
        return NextResponse.json({ ok: false, error: "This code is already in use" }, { status: 400 });
      }
    }

    const updated = await db.bookingOffer.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(discountPercent !== undefined ? { discountPercent } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(code !== undefined ? { code: normalizedCode || null } : {}),
        ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
        ...(maxRedemptions !== undefined ? { maxRedemptions } : {}),
        ...(onePerOwner !== undefined ? { onePerOwner } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Update booking offer error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/booking-offers/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await db.bookingOffer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Offer not found" }, { status: 404 });
    }

    await db.bookingOffer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete booking offer error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
