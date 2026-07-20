import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["FIRST_BOOKING", "PROMOTIONAL"]),
  discountPercent: z.number().int().min(1).max(100),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  code: z.string().trim().min(3).max(40).optional(),
  categoryId: z.string().optional(),
  maxRedemptions: z.number().int().positive().optional(),
  onePerOwner: z.boolean().optional(),
  imageUrl: z.string().optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().optional(),
});

/**
 * GET /api/admin/booking-offers
 * List all booking discount offers (active, upcoming, expired)
 */
export async function GET() {
  try {
    await requireAdmin();
    const offers = await db.bookingOffer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        category: { select: { name: true } },
        _count: { select: { redemptions: true } },
      },
    });
    return NextResponse.json({ ok: true, data: offers });
  } catch (error) {
    console.error("List booking offers error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/booking-offers
 * Create a new booking discount offer/campaign
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const validation = createSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { name, type, discountPercent, startDate, endDate, code, categoryId, maxRedemptions, onePerOwner, imageUrl, description, sortOrder } = validation.data;

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json(
        { ok: false, error: "End date must be after start date" },
        { status: 400 }
      );
    }

    const normalizedCode = code ? code.toUpperCase() : undefined;
    if (normalizedCode) {
      const existing = await db.bookingOffer.findUnique({ where: { code: normalizedCode } });
      if (existing) {
        return NextResponse.json({ ok: false, error: "This code is already in use" }, { status: 400 });
      }
    }

    const offer = await db.bookingOffer.create({
      data: {
        name,
        type,
        discountPercent,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        code: normalizedCode || null,
        categoryId: categoryId || null,
        maxRedemptions: maxRedemptions ?? null,
        onePerOwner: onePerOwner ?? false,
        imageUrl: imageUrl ?? null,
        description: description ?? null,
        sortOrder: sortOrder ?? 0,
        createdById: session.id,
      },
    });

    return NextResponse.json({ ok: true, data: offer }, { status: 201 });
  } catch (error) {
    console.error("Create booking offer error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
