import { db } from "@/server/db";
import { createNotification, notifyRestaurantTeam } from "@/server/notifications/service";
import { NotificationType, RestaurantRole } from "@prisma/client";
import { sendAMCPaymentVerifiedEmail } from "@/lib/email";

interface ActivateAMCContractOptions {
  verifiedById?: string;
  paymentMethod: "RAZORPAY" | "SCREENSHOT";
  razorpay?: {
    orderId: string;
    paymentId: string;
    // Not available in the webhook payload (which is signed differently, at
    // the request-body level) - only the sync verify path has this.
    signature?: string;
  };
}

/**
 * Verifies an AMCPayment and activates its contract: generates a contract
 * number, creates the AMCContract + AMCScheduledVisit rows, marks a renewed
 * contract's predecessor RENEWED, and notifies the owner/team/email.
 *
 * Shared by the admin manual-verify route, the Razorpay sync verify route,
 * and the Razorpay webhook — all three previously duplicated (or, for the
 * Razorpay paths, were missing) this logic.
 */
export async function activateAMCContract(
  paymentId: string,
  opts: ActivateAMCContractOptions
) {
  const payment = await db.aMCPayment.findUnique({
    where: { id: paymentId },
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
    throw new Error("AMC Payment not found");
  }

  if (
    payment.status !== "PENDING" &&
    payment.status !== "UPLOADED" &&
    payment.status !== "REJECTED"
  ) {
    throw new Error("Payment already processed");
  }

  const proposal = payment.request.proposal;
  if (!proposal) {
    throw new Error("No proposal found for this request");
  }

  const year = new Date().getFullYear();

  const startDate = payment.request.preferredStartDate;
  const periodYears = proposal.contractPeriod === "2 YEAR" ? 2 : 1;
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + periodYears);

  const contract = await db.$transaction(async (tx) => {
    // Count inside the transaction so two concurrent verifications can't
    // compute the same contract number.
    const count = await tx.aMCContract.count();
    const contractNumber = `AMC-${year}-${String(count + 1).padStart(3, "0")}`;

    const newContract = await tx.aMCContract.create({
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
        amount: proposal.price,
      },
    });

    await tx.aMCPayment.update({
      where: { id: paymentId },
      data: {
        status: "VERIFIED",
        verifiedById: opts.verifiedById,
        verifiedAt: new Date(),
        paymentMethod: opts.paymentMethod,
        ...(opts.razorpay
          ? {
              razorpayOrderId: opts.razorpay.orderId,
              razorpayPaymentId: opts.razorpay.paymentId,
              ...(opts.razorpay.signature
                ? { razorpaySignature: opts.razorpay.signature }
                : {}),
            }
          : {}),
      },
    });

    await tx.aMCRequest.update({
      where: { id: payment.requestId },
      data: { status: "CONTRACT_ACTIVE" },
    });

    if (payment.request.renewalOfContractId) {
      await tx.aMCContract.update({
        where: { id: payment.request.renewalOfContractId },
        data: { status: "RENEWED" },
      });
    }

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
        contractId: newContract.id,
        visitNumber: i + 1,
        visitType: "PREVENTIVE" as const,
        scheduledDate: visitDate,
        status: "SCHEDULED" as const,
      });
    }

    if (visits.length > 0) {
      await tx.aMCScheduledVisit.createMany({ data: visits });
    }

    // AUTO-SYNC: Create Expense entry
    await tx.expense.create({
      data: {
        ownerId: payment.ownerId,
        restaurantId: payment.request.restaurantId,
        category: "MAINTENANCE",
        amount: payment.amount,
        expenseDate: new Date(),
        description: `AMC contract ${newContract.contractNumber} - ${payment.paymentType === "RENEWAL" ? "renewal" : "activation"} payment`,
      },
    });

    // AUTO-SYNC: Create Cashbook entry (expense = cash out)
    await tx.cashbookEntry.create({
      data: {
        ownerId: payment.ownerId,
        restaurantId: payment.request.restaurantId,
        entryDate: new Date(),
        entryType: "CASH_OUT",
        amount: payment.amount,
        paymentMode: "CASH", // Default to cash, matches the same simplification used by the engineer job-completion cashbook sync
        description: `AMC contract ${newContract.contractNumber} payment`,
        category: "MAINTENANCE",
        createdBy: payment.ownerId,
      },
    });

    return newContract;
  });

  createNotification({
    userId: payment.ownerId,
    title: "Payment Verified - AMC Contract Active!",
    message: `Your payment for "${payment.request.restaurant.name}" has been verified. Contract ${contract.contractNumber} is now active.`,
    type: NotificationType.AMC,
    linkUrl: `/owner/amc-contracts/${contract.id}`,
  }).catch((error) => {
    console.error("Failed to notify owner of AMC contract activation:", error);
  });

  notifyRestaurantTeam({
    restaurantId: payment.request.restaurantId,
    excludeUserIds: [payment.ownerId],
    roles: [RestaurantRole.MANAGER, RestaurantRole.ACCOUNTANT],
    title: "AMC Payment Verified",
    message: `AMC payment for "${payment.request.restaurant.name}" has been verified. Contract ${contract.contractNumber} is now active.`,
    type: NotificationType.AMC,
    linkUrl: `/owner/amc-contracts/${contract.id}`,
  });

  const owner = await db.user.findUnique({
    where: { id: payment.ownerId },
    select: { email: true, name: true },
  });
  if (owner?.email) {
    sendAMCPaymentVerifiedEmail(
      owner.email,
      owner.name || "Restaurant Owner",
      payment.request.restaurant.name,
      contract.contractNumber,
      `/owner/amc-contracts/${contract.id}`
    ).catch((error) => {
      console.error("Failed to send AMC payment verified email:", error);
    });
  }

  return { contract };
}
