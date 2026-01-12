import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { z } from "zod";

const updateQuantitySchema = z.object({
  quantity: z.number().int().min(1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await requireOwner();
    const { itemId } = await params;

    const body = await request.json();
    const validation = updateQuantitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify item belongs to user's cart
    const cartItem = await db.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { ownerId: session.id },
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { ok: false, error: "Cart item not found" },
        { status: 404 }
      );
    }

    const updatedItem = await db.cartItem.update({
      where: { id: itemId },
      data: { qty: validation.data.quantity },
    });

    return NextResponse.json({ ok: true, data: updatedItem });
  } catch (error) {
    console.error("Update cart item error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await requireOwner();
    const { itemId } = await params;

    // Verify item belongs to user's cart
    const cartItem = await db.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { ownerId: session.id },
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        { ok: false, error: "Cart item not found" },
        { status: 404 }
      );
    }

    await db.cartItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete cart item error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
