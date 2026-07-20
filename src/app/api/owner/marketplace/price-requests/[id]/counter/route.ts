import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { createNotificationForRole } from "@/server/notifications/service";
import { Role, NotificationType } from "@prisma/client";
import { z } from "zod";

const counterSchema = z.object({
  counterPrice: z.number().int().positive(),
  message: z.string().max(500).optional(),
});

/**
 * PATCH /api/owner/marketplace/price-requests/[id]/counter
 * Owner counters admin's unlocked price with their own proposed price.
 * Only allowed while the request is UNLOCKED and not expired.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    const body = await request.json();
    const validation = counterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { counterPrice, message } = validation.data;

    const priceRequest = await db.priceUnlockRequest.findUnique({
      where: { id },
      include: {
        product: { include: { product: { select: { name: true } } } },
        restaurant: { select: { name: true } },
      },
    });

    if (!priceRequest) {
      return NextResponse.json({ ok: false, error: "Price request not found" }, { status: 404 });
    }

    if (priceRequest.ownerId !== session.id) {
      return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
    }

    if (priceRequest.status !== "UNLOCKED") {
      return NextResponse.json(
        { ok: false, error: "You can only counter a request that admin has responded to" },
        { status: 400 }
      );
    }

    if (priceRequest.validUntil && priceRequest.validUntil < new Date()) {
      return NextResponse.json(
        { ok: false, error: "This price offer has expired" },
        { status: 400 }
      );
    }

    const updated = await db.priceUnlockRequest.update({
      where: { id },
      data: {
        status: "COUNTERED",
        ownerCounterPrice: counterPrice,
        message: message || null,
      },
    });

    const productName = priceRequest.product.product?.name || "Unknown";
    createNotificationForRole(
      Role.ADMIN,
      "Price Counter-Offer",
      `${session.name} from ${priceRequest.restaurant.name} countered with ₹${counterPrice.toLocaleString("en-IN")} for "${productName}"`,
      NotificationType.ORDER,
      "/admin/my-store/price-requests"
    ).catch(console.error);

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Counter price request error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
