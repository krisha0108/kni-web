import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import {
  notifyOwnerPaymentVerified,
  notifyOwnerPaymentRejected,
  notifyOwnerEngineerAssigned,
  notifyEngineerNewJob,
} from "@/server/notifications/service";
import { z } from "zod";
import { rejectionReasonSchema } from "@/lib/validations/rejection";

const actionSchema = z.object({
  action: z.enum(["verify-payment", "reject-payment", "adjust-slot", "assign-engineer"]),
  rejectionReason: z.string().optional(),
  reason: z.string().optional(), // Deprecated: use rejectionReason instead
  engineerId: z.string().optional(),
  slotStart: z.string().optional(),
  slotEnd: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const booking = await db.serviceBooking.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        restaurant: true,
        items: {
          include: {
            serviceItem: {
              include: {
                category: true,
                subCategory: true,
              },
            },
            partItem: {
              include: {
                category: true,
                subCategory: true,
              },
            },
          },
        },
        paymentProof: true,
        engineerAssignments: {
          include: {
            engineer: { select: { id: true, name: true, email: true } },
            workLog: true,
          },
          orderBy: {
            assignedAt: 'desc',
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: booking });
  } catch (error) {
    console.error("Get booking error:", error);
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
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const { action, engineerId, slotStart, slotEnd } = body;

    const booking = await db.serviceBooking.findUnique({
      where: { id },
      include: { paymentProof: true, restaurant: true },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    if (action === "verify_payment") {
      // Prevent re-verification
      if (booking.paymentProof?.status === "VERIFIED") {
        return NextResponse.json(
          { ok: false, error: "Payment is already verified" },
          { status: 400 }
        );
      }

      await db.paymentProof.update({
        where: { bookingId: id },
        data: { status: "VERIFIED", verifiedAt: new Date(), rejectionReason: null, adminNote: null },
      });
      await db.serviceBooking.update({
        where: { id },
        data: { status: "PAYMENT_VERIFIED" },
      });
      await notifyOwnerPaymentVerified(booking.ownerId, id);
      return NextResponse.json({ ok: true });
    }

    if (action === "reject_payment") {
      // DEPRECATED: This action format is deprecated. Use POST with "reject-payment" action instead.
      // For backward compatibility, we'll require a rejection reason via query param or body
      return NextResponse.json(
        {
          ok: false,
          error: "This endpoint is deprecated. Use POST /api/admin/bookings/:id with action 'reject-payment' and rejectionReason field",
        },
        { status: 400 }
      );
    }

    if (action === "assign_engineer") {
      if (!engineerId) {
        return NextResponse.json(
          { ok: false, error: "Engineer ID(s) required" },
          { status: 400 }
        );
      }
      if (booking.status !== "PAYMENT_VERIFIED" && booking.status !== "ENGINEER_ASSIGNED") {
        return NextResponse.json(
          { ok: false, error: "Payment must be verified before assigning engineers" },
          { status: 400 }
        );
      }

      // Support both single engineer (string) and multiple engineers (array)
      const engineerIds = Array.isArray(engineerId) ? engineerId : [engineerId];

      if (engineerIds.length === 0) {
        return NextResponse.json(
          { ok: false, error: "At least one engineer must be selected" },
          { status: 400 }
        );
      }

      // Verify all engineers exist and are active
      const engineers = await db.user.findMany({
        where: {
          id: { in: engineerIds },
          role: "ENGINEER",
          isActive: true,
        },
      });

      if (engineers.length !== engineerIds.length) {
        return NextResponse.json(
          { ok: false, error: "One or more engineers not found or inactive" },
          { status: 404 }
        );
      }

      // Check for existing assignments to avoid duplicates
      const existingAssignments = await db.engineerAssignment.findMany({
        where: {
          bookingId: id,
          engineerId: { in: engineerIds },
        },
      });

      const existingEngineerIds = existingAssignments.map((a) => a.engineerId);
      const newEngineerIds = engineerIds.filter((eId) => !existingEngineerIds.includes(eId));

      // Create assignments for new engineers only
      const assignments = await Promise.all(
        newEngineerIds.map((eId) =>
          db.engineerAssignment.create({
            data: {
              bookingId: id,
              engineerId: eId,
              status: "PENDING",
            },
          })
        )
      );

      // Update booking status and slot times
      await db.serviceBooking.update({
        where: { id },
        data: {
          status: "ENGINEER_ASSIGNED",
          ...(slotStart && { adminAdjustedSlotStart: new Date(slotStart) }),
          ...(slotEnd && { adminAdjustedSlotEnd: new Date(slotEnd) }),
        },
      });

      // Send notifications to owner and all newly assigned engineers
      if (assignments.length > 0) {
        const engineerNames = engineers
          .filter((e) => newEngineerIds.includes(e.id))
          .map((e) => e.name)
          .join(", ");
        await notifyOwnerEngineerAssigned(booking.ownerId, id, engineerNames);

        // Notify each engineer
        await Promise.all(
          assignments.map((assignment) =>
            notifyEngineerNewJob(assignment.engineerId, assignment.id, booking.restaurant.name)
          )
        );
      }

      return NextResponse.json({
        ok: true,
        message: `${assignments.length} engineer(s) assigned successfully${
          existingEngineerIds.length > 0
            ? `. ${existingEngineerIds.length} engineer(s) were already assigned.`
            : ""
        }`,
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update booking error:", error);
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
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = actionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { action, reason, engineerId, slotStart, slotEnd } = validation.data;

    const booking = await db.serviceBooking.findUnique({
      where: { id },
      include: { paymentProof: true },
    });

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    if (action === "verify-payment") {
      // Prevent re-verification
      if (booking.paymentProof?.status === "VERIFIED") {
        return NextResponse.json(
          { ok: false, error: "Payment is already verified" },
          { status: 400 }
        );
      }

      await db.paymentProof.update({
        where: { bookingId: id },
        data: { status: "VERIFIED", verifiedAt: new Date(), rejectionReason: null, adminNote: null },
      });
      await db.serviceBooking.update({
        where: { id },
        data: { status: "PAYMENT_VERIFIED" },
      });
      await notifyOwnerPaymentVerified(booking.ownerId, id);
    } else if (action === "reject-payment") {
      // Prevent re-rejection
      if (booking.paymentProof?.status === "REJECTED") {
        return NextResponse.json(
          { ok: false, error: "Payment is already rejected" },
          { status: 400 }
        );
      }

      // Support both old 'reason' and new 'rejectionReason' fields
      const rejectionReasonValue = validation.data.rejectionReason || validation.data.reason;

      if (!rejectionReasonValue) {
        return NextResponse.json(
          { ok: false, error: "Rejection reason is required" },
          { status: 400 }
        );
      }

      // Validate rejection reason
      const reasonValidation = rejectionReasonSchema.safeParse(rejectionReasonValue);
      if (!reasonValidation.success) {
        return NextResponse.json(
          { ok: false, error: reasonValidation.error.issues[0]?.message || "Invalid rejection reason" },
          { status: 400 }
        );
      }

      await db.paymentProof.update({
        where: { bookingId: id },
        data: {
          status: "REJECTED",
          rejectionReason: reasonValidation.data,
          adminNote: reasonValidation.data, // Keep for backward compatibility
        },
      });
      await db.serviceBooking.update({
        where: { id },
        data: { status: "PAYMENT_REJECTED" },
      });
      await notifyOwnerPaymentRejected(booking.ownerId, id, reasonValidation.data);
    } else if (action === "adjust-slot") {
      if (!slotStart) {
        return NextResponse.json(
          { ok: false, error: "Slot start time is required" },
          { status: 400 }
        );
      }
      await db.serviceBooking.update({
        where: { id },
        data: {
          adminAdjustedSlotStart: new Date(slotStart),
          adminAdjustedSlotEnd: slotEnd ? new Date(slotEnd) : null,
        },
      });
    } else if (action === "assign-engineer") {
      if (!engineerId) {
        return NextResponse.json(
          { ok: false, error: "Engineer ID is required" },
          { status: 400 }
        );
      }
      if (booking.status !== "PAYMENT_VERIFIED") {
        return NextResponse.json(
          { ok: false, error: "Cannot assign engineer before payment verification" },
          { status: 400 }
        );
      }
      const engineer = await db.user.findUnique({
        where: { id: engineerId, role: "ENGINEER" },
      });
      if (!engineer) {
        return NextResponse.json(
          { ok: false, error: "Engineer not found" },
          { status: 404 }
        );
      }
      const assignment = await db.engineerAssignment.create({
        data: {
          bookingId: id,
          engineerId,
          status: "PENDING",
        },
      });
      await db.serviceBooking.update({
        where: { id },
        data: { status: "ENGINEER_ASSIGNED" },
      });
      const restaurant = await db.restaurant.findUnique({ where: { id: booking.restaurantId } });
      await notifyOwnerEngineerAssigned(booking.ownerId, id, engineer.name);
      await notifyEngineerNewJob(engineerId, assignment.id, restaurant?.name || "Restaurant");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Booking action error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
