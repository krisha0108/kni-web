import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { saveUploadedFile } from "@/server/upload/localUpload";
import { notifyAdminsNewPaymentUploaded } from "@/server/notifications/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const booking = await db.serviceBooking.findUnique({
      where: { id },
    });

    if (!booking || booking.ownerId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.status !== "SLOT_SELECTED") {
      return NextResponse.json(
        { ok: false, error: "Cannot upload payment for this booking status" },
        { status: 400 }
      );
    }

    const { url } = await saveUploadedFile(file, "payment");

    await db.paymentProof.create({
      data: {
        bookingId: id,
        ownerId: session.id,
        screenshotUrl: url,
        status: "UPLOADED",
      },
    });

    await db.serviceBooking.update({
      where: { id },
      data: { status: "PAYMENT_UPLOADED" },
    });

    await notifyAdminsNewPaymentUploaded(id, session.name);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Upload payment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
