import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { requireRestaurantAccess } from "@/server/auth/restaurant-rbac";

/**
 * GET /api/owner/amc-proposals/[id]
 * Owner views proposal for their AMC request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    const proposal = await db.aMCProposal.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            restaurant: { select: { id: true, name: true, city: true, address: true } },
          },
        },
        contract: true,
      },
    });

    if (!proposal) {
      return NextResponse.json({ ok: false, error: "Proposal not found" }, { status: 404 });
    }

    // RBAC: verify user has amc:read access for this restaurant
    await requireRestaurantAccess(session, proposal.request.restaurantId, "amc:read");

    return NextResponse.json({ ok: true, data: proposal });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && (error.message === "Unauthorized" || error.message.includes("Unauthorized")) ? 401 : 500 }
    );
  }
}
