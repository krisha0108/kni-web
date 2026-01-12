import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireApprovedVendor } from "@/server/auth/rbac";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().int().positive(),
  unit: z.string().min(1),
  categoryId: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireApprovedVendor();

    const products = await db.vendorProduct.findMany({
      where: { vendorId: session.id, deletedAt: null },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: products });
  } catch (error) {
    console.error("Get vendor products error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireApprovedVendor();

    const body = await request.json();
    const validation = productSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const product = await db.vendorProduct.create({
      data: {
        ...validation.data,
        vendorId: session.id,
        categoryId: validation.data.categoryId || null,
        isActive: true,
      },
    });

    return NextResponse.json({ ok: true, data: product });
  } catch (error) {
    console.error("Create vendor product error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
