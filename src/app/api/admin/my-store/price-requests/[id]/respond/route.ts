import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";
import { z } from "zod";

const respondSchema = z.object({
  action: z.enum(["UNLOCK", "DECLINE"]),
  unlockedPrice: z.number().int().positive().optional(),
  validUntil: z.string().datetime().optional(),
  adminNote: z.string().max(500).optional(),
});

/**
 * PATCH /api/admin/my-store/price-requests/[id]/respond
 * Admin responds to a price unlock request (set custom price or decline)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = respondSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { action, unlockedPrice, validUntil, adminNote } = validation.data;

    // Fetch the request with product info
    const priceRequest = await db.priceUnlockRequest.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            product: { select: { name: true } },
          },
        },
        owner: { select: { name: true } },
        restaurant: { select: { name: true } },
      },
    });

    if (!priceRequest) {
      return NextResponse.json(
        { ok: false, error: "Price request not found" },
        { status: 404 }
      );
    }

    const productName = priceRequest.product.product?.name || "Unknown";

    if (action === "UNLOCK") {
      if (!unlockedPrice) {
        return NextResponse.json(
          { ok: false, error: "Price is required when unlocking" },
          { status: 400 }
        );
      }

      const updated = await db.priceUnlockRequest.update({
        where: { id },
        data: {
          status: "UNLOCKED",
          unlockedPrice,
          validUntil: validUntil ? new Date(validUntil) : null,
          adminNote: adminNote || null,
        },
      });

      // Notify owner
      const priceFormatted = unlockedPrice.toLocaleString("en-IN");
      createNotification({
        userId: priceRequest.ownerId,
        title: "Price Unlocked!",
        message: `Your price for "${productName}" is ₹${priceFormatted}. Add to cart now!${validUntil ? " Offer valid until " + new Date(validUntil).toLocaleDateString("en-IN") + "." : ""}`,
        type: NotificationType.ORDER,
        linkUrl: "/owner/marketplace",
      }).catch(console.error);

      return NextResponse.json({ ok: true, data: updated });
    }

    if (action === "DECLINE") {
      const updated = await db.priceUnlockRequest.update({
        where: { id },
        data: {
          status: "DECLINED",
          adminNote: adminNote || null,
        },
      });

      // Notify owner
      createNotification({
        userId: priceRequest.ownerId,
        title: "Price Request Declined",
        message: `Your price request for "${productName}" was declined.${adminNote ? " Note: " + adminNote : ""}`,
        type: NotificationType.ORDER,
        linkUrl: "/owner/marketplace",
      }).catch(console.error);

      return NextResponse.json({ ok: true, data: updated });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Respond to price request error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
