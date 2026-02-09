import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";
import { generateServicePin } from "@/server/sms/service";
import { notifyOwnerServicePin } from "@/server/notifications/service";

/**
 * POST /api/engineer/jobs/:id/request-pin
 * Generate a service PIN and notify the owner
 * Body: { purpose: "START" | "COMPLETE" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("🔐 [request-pin] API called");
    const session = await requireEngineerMobile(request);
    console.log("🔐 [request-pin] Session:", session.id, session.name);
    const { id } = await params;
    console.log("🔐 [request-pin] Assignment ID:", id);
    const body = await request.json();
    const { purpose } = body;
    console.log("🔐 [request-pin] Purpose:", purpose);

    if (!purpose || !["START", "COMPLETE"].includes(purpose)) {
      return NextResponse.json(
        { ok: false, error: "Purpose must be START or COMPLETE" },
        { status: 400 }
      );
    }

    // Find the assignment
    const assignment = await db.engineerAssignment.findFirst({
      where: {
        id,
        engineerId: session.id,
      },
      include: {
        booking: {
          include: {
            owner: true,
            restaurant: true,
          },
        },
      },
    });

    if (!assignment) {
      console.log("🔐 [request-pin] ❌ Assignment NOT found for id:", id, "engineerId:", session.id);
      return NextResponse.json(
        { ok: false, error: "Assignment not found" },
        { status: 404 }
      );
    }
    console.log("🔐 [request-pin] ✅ Assignment found, status:", assignment.status);

    // Validate status based on purpose
    if (purpose === "START" && assignment.status !== "ACCEPTED") {
      return NextResponse.json(
        { ok: false, error: "Job must be accepted before requesting start PIN" },
        { status: 400 }
      );
    }

    if (purpose === "COMPLETE" && !["ACCEPTED", "IN_PROGRESS"].includes(assignment.status)) {
      return NextResponse.json(
        { ok: false, error: "Job must be in progress to request completion PIN" },
        { status: 400 }
      );
    }

    // Rate limit: 1 PIN request per 60 seconds
    if (
      assignment.servicePinExpiresAt &&
      assignment.servicePinPurpose === purpose
    ) {
      const pinCreatedAt = new Date(assignment.servicePinExpiresAt.getTime() - 10 * 60 * 1000);
      const secondsSinceLastPin = (Date.now() - pinCreatedAt.getTime()) / 1000;
      if (secondsSinceLastPin < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceLastPin);
        return NextResponse.json(
          { ok: false, error: `Please wait ${waitSeconds} seconds before requesting a new PIN` },
          { status: 429 }
        );
      }
    }

    // Generate new PIN
    const pin = generateServicePin();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store PIN on assignment
    console.log("🔐 [request-pin] Storing PIN:", pin, "for assignment:", id);
    const updated = await db.engineerAssignment.update({
      where: { id },
      data: {
        servicePin: pin,
        servicePinExpiresAt: expiresAt,
        servicePinPurpose: purpose,
        servicePinAttempts: 0,
      },
    });
    console.log("🔐 [request-pin] ✅ PIN stored! DB value:", updated.servicePin);

    // Notify owner with PIN
    await notifyOwnerServicePin(
      assignment.booking.ownerId,
      assignment.bookingId,
      pin,
      purpose,
      session.name
    );

    return NextResponse.json({
      ok: true,
      message: "PIN sent to owner",
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("🔐 [request-pin] ❌ ERROR:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
