import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendor } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";
import { z } from "zod";

const uploadSchema = z.object({
  collectionId: z.string().min(1, "collectionId is required"),
  screenshotUrl: z.string().min(1, "Screenshot URL is required"),
});

/**
 * POST /api/vendor/commission/upload
 * Vendor uploads payment screenshot for a commission collection
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireVendor();

    const body = await request.json();
    const parsed = uploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const { collectionId, screenshotUrl } = parsed.data;

    // Find the collection and verify ownership
    const collection = await db.vendorCommissionCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return NextResponse.json(
        { ok: false, error: "Commission collection not found" },
        { status: 404 }
      );
    }

    if (collection.vendorId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: This collection does not belong to you" },
        { status: 403 }
      );
    }

    // Only allow upload when status is REQUESTED or PAYMENT_REJECTED
    if (
      collection.status !== "REQUESTED" &&
      collection.status !== "PAYMENT_REJECTED"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot upload screenshot when collection status is ${collection.status}`,
        },
        { status: 400 }
      );
    }

    // Update the collection
    const updatedCollection = await db.vendorCommissionCollection.update({
      where: { id: collectionId },
      data: {
        status: "PAYMENT_UPLOADED",
        screenshotUrl,
        paymentUploadedAt: new Date(),
      },
    });

    // Notify all admins
    const vendor = await db.user.findUnique({
      where: { id: session.id },
      select: { name: true },
    });
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: "Commission Payment Uploaded",
        message: `Vendor ${vendor?.name || "Unknown"} uploaded commission payment screenshot`,
        type: NotificationType.PAYMENT,
        linkUrl: "/admin/vendor-commissions",
      });
    }

    return NextResponse.json({
      ok: true,
      data: updatedCollection,
    });
  } catch (error) {
    console.error("Upload commission screenshot error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      {
        status:
          error instanceof Error && error.message.includes("Unauthorized")
            ? 401
            : 500,
      }
    );
  }
}
