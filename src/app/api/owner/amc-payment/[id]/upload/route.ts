import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";
import { isValidImageUrl } from "@/lib/validations/url";

/**
 * POST /api/owner/amc-payment/[id]/upload
 * Owner uploads payment screenshot
 * [id] = AMCPayment ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id } = await params;
    const body = await request.json();
    const { screenshotUrl } = body;

    if (!screenshotUrl || !isValidImageUrl(screenshotUrl)) {
      return NextResponse.json({ ok: false, error: "A valid screenshot URL is required" }, { status: 400 });
    }

    const payment = await db.aMCPayment.findFirst({
      where: { id, ownerId: session.id },
      include: {
        request: {
          include: { restaurant: { select: { name: true } } },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "PENDING" && payment.status !== "REJECTED") {
      return NextResponse.json({ ok: false, error: "Payment screenshot can only be uploaded when status is PENDING or REJECTED" }, { status: 400 });
    }

    // Update payment with screenshot
    await db.$transaction([
      db.aMCPayment.update({
        where: { id },
        data: { screenshotUrl, status: "UPLOADED" },
      }),
      db.aMCRequest.update({
        where: { id: payment.requestId },
        data: { status: "PAYMENT_UPLOADED" },
      }),
    ]);

    // Notify admins
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: "AMC Payment Screenshot Uploaded",
        message: `Owner uploaded payment screenshot for "${payment.request.restaurant.name}". Please verify.`,
        type: NotificationType.AMC,
        linkUrl: `/admin/amc-requests`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Upload payment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
