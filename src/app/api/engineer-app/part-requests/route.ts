import { NextRequest, NextResponse } from "next/server";
// import { db } from "@/server/db";
// import { requireEngineerMobile } from "@/server/auth/rbac";
// import { PartRequestStatus, PartRequestPriority } from "@prisma/client";

/**
 * DISABLED: Parts request flow is currently disabled
 *
 * GET /api/engineer-app/part-requests
 * Get part requests for the engineer
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { ok: false, error: "Parts request feature is currently disabled" },
    { status: 503 }
  );

  /* DISABLED - Parts request flow
  try {
    const session = await requireEngineerMobile(request);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    // Build where clause
    const whereClause: Record<string, unknown> = {
      engineerId: session.id,
    };

    if (status && status !== "all") {
      whereClause.status = status.toUpperCase() as PartRequestStatus;
    }

    // Fetch part requests
    const partRequests = await db.partRequest.findMany({
      where: whereClause,
      include: {
        partItem: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assignment: {
          select: {
            id: true,
            bookingId: true,
            booking: {
              select: {
                id: true,
                restaurant: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get summary counts
    const summary = await db.partRequest.groupBy({
      by: ["status"],
      where: { engineerId: session.id },
      _count: { id: true },
    });

    const summaryMap: Record<string, number> = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      dispatched: 0,
      delivered: 0,
      cancelled: 0,
    };

    summary.forEach((item) => {
      summaryMap[item.status.toLowerCase()] = item._count.id;
      summaryMap.total += item._count.id;
    });

    // Transform for mobile app
    const transformedRequests = partRequests.map((req) => ({
      id: req.id,
      part_id: req.partItemId,
      part_name: req.partItem.name,
      part_description: req.partItem.description,
      part_price: req.partItem.price,
      part_category: req.partItem.category?.name || "Uncategorized",
      quantity: req.quantity,
      priority: req.priority.toLowerCase(),
      reason: req.reason,
      status: req.status.toLowerCase(),
      admin_note: req.adminNote,
      rejection_reason: req.rejectionReason,
      assignment_id: req.assignmentId,
      job_restaurant: req.assignment?.booking?.restaurant?.name || null,
      approved_at: req.approvedAt?.toISOString() || null,
      rejected_at: req.rejectedAt?.toISOString() || null,
      dispatched_at: req.dispatchedAt?.toISOString() || null,
      delivered_at: req.deliveredAt?.toISOString() || null,
      cancelled_at: req.cancelledAt?.toISOString() || null,
      created_at: req.createdAt.toISOString(),
      updated_at: req.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      success: true,
      data: transformedRequests,
      summary: summaryMap,
    });
  } catch (error) {
    console.error("Get part requests error:", error);
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
  DISABLED - Parts request flow */
}

/**
 * DISABLED: Parts request flow is currently disabled
 *
 * POST /api/engineer-app/part-requests
 * Create a new part request
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { ok: false, error: "Parts request feature is currently disabled" },
    { status: 503 }
  );

  /* DISABLED - Parts request flow
  try {
    const session = await requireEngineerMobile(request);

    const body = await request.json();
    const { part_id, quantity, priority, reason, assignment_id } = body;

    if (!part_id) {
      return NextResponse.json(
        { ok: false, error: "Part ID is required" },
        { status: 400 }
      );
    }

    // Verify the part exists
    const part = await db.partItem.findUnique({
      where: { id: part_id },
      include: {
        category: {
          select: { name: true },
        },
      },
    });

    if (!part) {
      return NextResponse.json(
        { ok: false, error: "Part not found" },
        { status: 404 }
      );
    }

    // Verify assignment if provided
    if (assignment_id) {
      const assignment = await db.engineerAssignment.findFirst({
        where: {
          id: assignment_id,
          engineerId: session.id,
        },
      });

      if (!assignment) {
        return NextResponse.json(
          { ok: false, error: "Assignment not found or not yours" },
          { status: 404 }
        );
      }
    }

    // Convert priority string to enum
    let priorityEnum: PartRequestPriority = PartRequestPriority.MEDIUM;
    if (priority) {
      const upperPriority = priority.toUpperCase();
      if (Object.values(PartRequestPriority).includes(upperPriority as PartRequestPriority)) {
        priorityEnum = upperPriority as PartRequestPriority;
      }
    }

    // Create the part request
    const partRequest = await db.partRequest.create({
      data: {
        engineerId: session.id,
        partItemId: part_id,
        assignmentId: assignment_id || null,
        quantity: quantity || 1,
        priority: priorityEnum,
        reason: reason || null,
        status: PartRequestStatus.PENDING,
      },
      include: {
        partItem: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      message: "Part request submitted successfully",
      data: {
        id: partRequest.id,
        part_id: partRequest.partItemId,
        part_name: partRequest.partItem.name,
        quantity: partRequest.quantity,
        priority: partRequest.priority.toLowerCase(),
        reason: partRequest.reason,
        status: partRequest.status.toLowerCase(),
        created_at: partRequest.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create part request error:", error);
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
  DISABLED - Parts request flow */
}
