import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineer } from "@/server/auth/rbac";
import { notifyOwnerJobCompleted, createNotificationForRole } from "@/server/notifications/service";
import { saveUploadedFile } from "@/server/upload/localUpload";
import { Role } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineer();
    const { id } = await params;

    const assignment = await db.engineerAssignment.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            restaurant: true,
            owner: { select: { id: true, name: true, phone: true, email: true } },
            items: {
              include: {
                serviceItem: true,
                partItem: true,
              },
            },
          },
        },
        workLog: true,
      },
    });

    if (!assignment || assignment.engineerId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: assignment });
  } catch (error) {
    console.error("Get job error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineer();
    const { id } = await params;

    const body = await request.json();
    const { action } = body;

    const assignment = await db.engineerAssignment.findFirst({
      where: { id, engineerId: session.id },
      include: { booking: { include: { restaurant: true, owner: true } } },
    });

    if (!assignment) {
      return NextResponse.json(
        { ok: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    if (action === "accept") {
      if (assignment.status !== "PENDING") {
        return NextResponse.json(
          { ok: false, error: "Job is not in pending status" },
          { status: 400 }
        );
      }
      await db.engineerAssignment.update({
        where: { id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "reject") {
      if (assignment.status !== "PENDING") {
        return NextResponse.json(
          { ok: false, error: "Job is not in pending status" },
          { status: 400 }
        );
      }
      await db.engineerAssignment.update({
        where: { id },
        data: { status: "REJECTED", respondedAt: new Date() },
      });
      await createNotificationForRole(
        Role.ADMIN,
        "Engineer Rejected Job",
        `${session.name} rejected job at ${assignment.booking.restaurant.name}`,
        `/admin/bookings/${assignment.bookingId}`
      );
      return NextResponse.json({ ok: true });
    }

    // "start" action removed - engineer can complete directly after accepting

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update job error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireEngineer();
    const { id } = await params;

    const contentType = request.headers.get("content-type") || "";
    
    let action: string;
    let reason: string | undefined;
    let completionNote: string | undefined;
    let proofImageUrls: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      action = formData.get("action") as string;
      reason = formData.get("reason") as string | undefined;
      completionNote = formData.get("completionNote") as string | undefined;
      const file = formData.get("proofImage") as File | null;
      if (file) {
        const result = await saveUploadedFile(file, "engineer-proof");
        proofImageUrls = result.url;
      }
    } else {
      const body = await request.json();
      action = body.action;
      reason = body.reason;
      completionNote = body.completionNote;
    }

    const assignment = await db.engineerAssignment.findUnique({
      where: { id },
      include: { booking: { include: { restaurant: true } } },
    });

    if (!assignment || assignment.engineerId !== session.id) {
      return NextResponse.json(
        { ok: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    if (action === "accept") {
      await db.engineerAssignment.update({
        where: { id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
      await db.serviceBooking.update({
        where: { id: assignment.bookingId },
        data: { status: "ACCEPTED_BY_ENGINEER" },
      });
    } else if (action === "reject") {
      await db.engineerAssignment.update({
        where: { id },
        data: { status: "REJECTED", respondedAt: new Date() },
      });
      await db.serviceBooking.update({
        where: { id: assignment.bookingId },
        data: { status: "REJECTED_BY_ENGINEER" },
      });
      await createNotificationForRole(
        Role.ADMIN,
        "Engineer Rejected Job",
        session.name + " rejected job at " + assignment.booking.restaurant.name + ". Reason: " + (reason || "No reason"),
        "/admin/bookings/" + assignment.bookingId
      );
    } else if (action === "complete") {
      if (!completionNote) {
        return NextResponse.json(
          { ok: false, error: "Completion note is required" },
          { status: 400 }
        );
      }
      await db.engineerWorkLog.create({
        data: {
          assignmentId: id,
          completionNote,
          ...(proofImageUrls && { proofImageUrls }),
        },
      });
      await db.engineerAssignment.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await db.serviceBooking.update({
        where: { id: assignment.bookingId },
        data: { status: "COMPLETED" },
      });
      await notifyOwnerJobCompleted(assignment.booking.ownerId, assignment.bookingId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Job action error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
