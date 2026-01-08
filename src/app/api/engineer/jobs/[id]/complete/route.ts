import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineer } from "@/server/auth/rbac";
import { saveUploadedFile } from "@/server/upload/localUpload";
import { notifyOwnerServiceCompleted } from "@/server/notifications/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineer();
    const { id } = await params;

    // Verify assignment belongs to this engineer and is in progress
    const assignment = await db.engineerAssignment.findFirst({
      where: { id, engineerId: session.id },
      include: {
        booking: {
          include: { owner: true, restaurant: true },
        },
        workLog: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { ok: false, error: "Job not found" },
        { status: 404 }
      );
    }

    if (assignment.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { ok: false, error: "Job must be in progress to complete" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const workNotes = formData.get("workNotes") as string;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Proof image is required" },
        { status: 400 }
      );
    }

    // Save the proof image
    const imageUrl = await saveUploadedFile(file, "engineer-proof");

    await db.$transaction([
      db.engineerAssignment.update({
        where: { id },
        data: { status: "COMPLETED" },
      }),
      db.serviceBooking.update({
        where: { id: assignment.bookingId },
        data: { status: "COMPLETED" },
      }),
      db.engineerWorkLog.update({
        where: { id: assignment.workLog!.id },
        data: {
          completedAt: new Date(),
          workNotes: workNotes || null,
          proofImageUrl: imageUrl,
        },
      }),
    ]);

    // Notify owner
    await notifyOwnerServiceCompleted(
      assignment.booking.ownerId,
      assignment.booking.id
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Complete engineer job error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
