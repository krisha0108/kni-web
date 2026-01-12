import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireApprovedVendor } from "@/server/auth/rbac";
import { z } from "zod";

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().int().min(0).optional(),
  stockQuantity: z.number().int().min(0).optional(),
  categoryId: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApprovedVendor();
    const { id } = await params;

    const body = await request.json();
    const validation = updateProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify product belongs to this vendor
    const existing = await db.vendorProduct.findFirst({
      where: { id, vendorId: session.id },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const product = await db.vendorProduct.update({
      where: { id },
      data: {
        ...validation.data,
        updatedAt: new Date(),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, data: product });
  } catch (error) {
    console.error("Update vendor product error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApprovedVendor();
    const { id } = await params;

    // Verify product belongs to this vendor
    const existing = await db.vendorProduct.findFirst({
      where: { id, vendorId: session.id },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Product not found" },
        { status: 404 }
      );
    }

    await db.vendorProduct.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete vendor product error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
