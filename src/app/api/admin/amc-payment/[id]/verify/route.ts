import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { createNotification, notifyRestaurantTeam } from "@/server/notifications/service";
import { NotificationType, RestaurantRole } from "@prisma/client";

/**
 * POST /api/admin/amc-payment/[id]/verify
 * Admin verifies payment → Contract gets created
 * [id] = AMCPayment ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const payment = await db.aMCPayment.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            restaurant: { select: { id: true, name: true } },
            proposal: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "UPLOADED") {
      return NextResponse.json({ ok: false, error: "Only UPLOADED payments can be verified" }, { status: 400 });
    }

    const proposal = payment.request.proposal;
    if (!proposal) {
      return NextResponse.json({ ok: false, error: "No proposal found for this request" }, { status: 400 });
    }

    // Generate contract number
    const year = new Date().getFullYear();
    const count = await db.aMCContract.count();
    const contractNumber = `AMC-${year}-${String(count + 1).padStart(3, "0")}`;

    // Calculate dates
    const startDate = payment.request.preferredStartDate;
    const periodYears = proposal.contractPeriod === "2 YEAR" ? 2 : 1;
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + periodYears);

    // Determine billing cycle and amount
    let billingCycle = "MONTHLY";
    let amountPerCycle = proposal.monthlyPrice;
    if (proposal.annualPrice) {
      billingCycle = "ANNUAL";
      amountPerCycle = proposal.annualPrice;
    } else if (proposal.quarterlyPrice) {
      billingCycle = "QUARTERLY";
      amountPerCycle = proposal.quarterlyPrice;
    }

    // Create contract, update payment, update request in transaction
    const [contract] = await db.$transaction([
      db.aMCContract.create({
        data: {
          proposalId: proposal.id,
          requestId: payment.requestId,
          ownerId: payment.ownerId,
          restaurantId: payment.request.restaurantId,
          contractNumber,
          coveredEquipment: proposal.coveredEquipment || [],
          preventiveVisits: proposal.preventiveVisits,
          freeBreakdownVisits: proposal.freeBreakdownVisits,
          responseTimeSLA: proposal.responseTimeSLA,
          resolutionTimeSLA: proposal.resolutionTimeSLA,
          startDate,
          endDate,
          billingCycle,
          amountPerCycle,
        },
      }),
      db.aMCPayment.update({
        where: { id },
        data: {
          status: "VERIFIED",
          verifiedById: session.id,
          verifiedAt: new Date(),
        },
      }),
      db.aMCRequest.update({
        where: { id: payment.requestId },
        data: { status: "CONTRACT_ACTIVE" },
      }),
    ]);

    // If this is a renewal, mark old contract as RENEWED
    if (payment.request.renewalOfContractId) {
      await db.aMCContract.update({
        where: { id: payment.request.renewalOfContractId },
        data: { status: "RENEWED" },
      });
    }

    // Auto-generate scheduled visits
    const visitFrequency = payment.request.visitFrequency;
    const visits = [];
    for (let i = 0; i < proposal.preventiveVisits; i++) {
      const visitDate = new Date(startDate);
      if (visitFrequency === "MONTHLY") {
        visitDate.setMonth(visitDate.getMonth() + i);
      } else if (visitFrequency === "BI_MONTHLY") {
        visitDate.setMonth(visitDate.getMonth() + i * 2);
      } else if (visitFrequency === "QUARTERLY") {
        visitDate.setMonth(visitDate.getMonth() + i * 3);
      }

      visits.push({
        contractId: contract.id,
        visitNumber: i + 1,
        visitType: "PREVENTIVE",
        scheduledDate: visitDate,
        status: "SCHEDULED" as const,
      });
    }

    if (visits.length > 0) {
      await db.aMCScheduledVisit.createMany({ data: visits });
    }

    // Notify owner
    await createNotification({
      userId: payment.ownerId,
      title: "Payment Verified - AMC Contract Active!",
      message: `Your payment for "${payment.request.restaurant.name}" has been verified. Contract ${contractNumber} is now active.`,
      type: NotificationType.AMC,
      linkUrl: `/owner/amc-contracts/${contract.id}`,
    });

    // Notify team members (non-blocking)
    notifyRestaurantTeam({
      restaurantId: payment.request.restaurantId,
      excludeUserIds: [payment.ownerId],
      roles: [RestaurantRole.MANAGER, RestaurantRole.ACCOUNTANT],
      title: "AMC Payment Verified",
      message: `AMC payment for "${payment.request.restaurant.name}" has been verified. Contract ${contractNumber} is now active.`,
      type: NotificationType.AMC,
      linkUrl: `/owner/amc-contracts/${contract.id}`,
    });

    return NextResponse.json({ ok: true, data: contract });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
