import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";

/**
 * GET /api/owner/amc-proposals/[id]
 * Owner views proposal for their AMC request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
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

    if (!proposal || proposal.request.ownerId !== session.id) {
      return NextResponse.json({ ok: false, error: "Proposal not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: proposal });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
