import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";
import { createNotification } from "@/server/notifications/service";
import { NotificationType } from "@prisma/client";

/**
 * POST /api/owner/amc-contracts/[id]/renew
 * Owner requests renewal → Creates a new AMCRequest (with renewalOfContractId)
 * This goes through the full flow: Admin schedules re-survey → Engineer surveys → Admin creates proposal → Owner pays → New contract
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id } = await params;

    const contract = await db.aMCContract.findFirst({
      where: { id, ownerId: session.id },
      include: {
        restaurant: { select: { id: true, name: true } },
        proposal: {
          include: {
            request: {
              select: { kitchenType: true, planType: true, visitFrequency: true, equipmentCategories: true },
            },
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ ok: false, error: "Contract not found" }, { status: 404 });
    }

    if (contract.status !== "ACTIVE" && contract.status !== "EXPIRED") {
      return NextResponse.json({ ok: false, error: "Contract cannot be renewed. Only ACTIVE or EXPIRED contracts can be renewed." }, { status: 400 });
    }

    // Check if a renewal request already exists
    const existingRenewal = await db.aMCRequest.findFirst({
      where: {
        renewalOfContractId: id,
        status: { notIn: ["CANCELLED"] },
      },
    });

    if (existingRenewal) {
      return NextResponse.json({ ok: false, error: "A renewal request already exists for this contract" }, { status: 400 });
    }

    // Get details from original request via proposal
    const originalRequest = contract.proposal?.request;
    const kitchenType = originalRequest?.kitchenType || "CLOUD_KITCHEN";
    const planType = originalRequest?.planType || "BASIC";
    const visitFrequency = originalRequest?.visitFrequency || "MONTHLY";
    const equipmentCategories = originalRequest?.equipmentCategories || [];

    // New preferred start date = old contract end date
    const preferredStartDate = new Date(contract.endDate);

    // Create renewal AMC request
    const renewalRequest = await db.aMCRequest.create({
      data: {
        ownerId: session.id,
        restaurantId: contract.restaurantId,
        renewalOfContractId: id,
        kitchenType,
        planType,
        visitFrequency,
        equipmentCategories,
        preferredStartDate,
        notes: `Renewal of contract ${contract.contractNumber}`,
      },
    });

    // Notify admins
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: "AMC Renewal Request",
        message: `Owner requested renewal of contract ${contract.contractNumber} for "${contract.restaurant.name}". Please schedule a re-survey.`,
        type: NotificationType.AMC,
        linkUrl: `/admin/amc-requests`,
      });
    }

    return NextResponse.json({ ok: true, data: renewalRequest });
  } catch (error) {
    console.error("Renew contract error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
