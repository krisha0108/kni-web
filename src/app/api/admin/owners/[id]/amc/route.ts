import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

// GET - Full AMC/CAMC chain for one owner: request -> survey -> proposal -> contract
// (with its scheduled visits + breakdown requests nested), plus legacy AMCSubscriptions.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const [requests, legacySubscriptions] = await Promise.all([
      db.aMCRequest.findMany({
        where: { ownerId: id },
        select: {
          id: true,
          status: true,
          contractCategory: true,
          planType: true,
          visitFrequency: true,
          preferredStartDate: true,
          createdAt: true,
          restaurant: { select: { id: true, name: true } },
          survey: {
            select: { id: true, status: true, scheduledDate: true, completedDate: true, overallCondition: true },
          },
          proposal: {
            select: {
              id: true,
              status: true,
              price: true,
              contractPeriod: true,
              preventiveVisits: true,
              sentAt: true,
              acceptedAt: true,
              contract: {
                select: {
                  id: true,
                  contractNumber: true,
                  status: true,
                  startDate: true,
                  endDate: true,
                  amount: true,
                  preventiveVisits: true,
                  breakdownVisitsUsed: true,
                  freeBreakdownVisits: true,
                  scheduledVisits: {
                    select: {
                      id: true,
                      visitNumber: true,
                      visitType: true,
                      status: true,
                      scheduledDate: true,
                      completedDate: true,
                      engineer: { select: { id: true, name: true } },
                    },
                    orderBy: { visitNumber: "asc" },
                  },
                  breakdownRequests: {
                    select: { id: true, equipmentName: true, status: true, urgency: true, createdAt: true },
                    orderBy: { createdAt: "desc" },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.aMCSubscription.findMany({
        where: { ownerId: id },
        select: {
          id: true,
          contractNumber: true,
          status: true,
          startDate: true,
          endDate: true,
          totalAmount: true,
          source: true,
          providerName: true,
          restaurant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ ok: true, data: { requests, legacySubscriptions } });
  } catch (error) {
    console.error("Get owner AMC error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
