/**
 * ============================================================================
 * ENGINEER PART REQUESTS API (Mobile App)
 * ============================================================================
 *
 * PARTS REQUEST FLOW OVERVIEW:
 * ----------------------------
 * This API handles part requests from service engineers via the mobile app.
 * Engineers can request parts needed for their service jobs, and admins
 * process these requests through the admin panel.
 *
 * COMPLETE FLOW DIAGRAM:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │                        PARTS REQUEST FLOW                           │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   ENGINEER (Mobile/Web)                    ADMIN (Web Panel)
 *   ─────────────────────                    ──────────────────
 *
 *   [1. Create Request]
 *         │
 *         ▼
 *   ┌─────────────┐
 *   │   PENDING   │◄────────────────────── Request created, awaiting review
 *   └─────────────┘
 *         │
 *         ├──── [Engineer can CANCEL] ──► [CANCELLED] (End)
 *         │
 *         ▼
 *   ┌─────────────────────────────────────────────────────┐
 *   │              ADMIN REVIEWS REQUEST                   │
 *   │  - Checks part availability (stock)                  │
 *   │  - Verifies engineer's assignment                    │
 *   │  - Reviews priority and reason                       │
 *   └─────────────────────────────────────────────────────┘
 *         │
 *         ├────────────────────┬────────────────────┐
 *         ▼                    ▼                    │
 *   [Admin APPROVES]    [Admin REJECTS]             │
 *         │                    │                    │
 *         ▼                    ▼                    │
 *   ┌─────────────┐      ┌─────────────┐           │
 *   │  APPROVED   │      │  REJECTED   │ (End)     │
 *   └─────────────┘      └─────────────┘           │
 *         │              (Engineer sees             │
 *         │               rejection reason)         │
 *         ▼                                        │
 *   [Admin DISPATCHES part]                        │
 *         │                                        │
 *         ▼                                        │
 *   ┌─────────────┐                               │
 *   │ DISPATCHED  │◄───────────────────────────────┘
 *   └─────────────┘
 *         │
 *         ▼
 *   [Engineer CONFIRMS DELIVERY]
 *         │
 *         ▼
 *   ┌─────────────┐
 *   │  DELIVERED  │ (End - Part now in engineer's inventory)
 *   └─────────────┘
 *
 * API ENDPOINTS IN THIS FILE:
 * ---------------------------
 * GET  /api/engineer-app/part-requests
 *      - Fetch engineer's own part requests
 *      - Filter by status (pending, approved, dispatched, delivered, etc.)
 *      - Returns summary counts for UI badges
 *
 * POST /api/engineer-app/part-requests
 *      - Create new part request
 *      - Required: part_id
 *      - Optional: quantity, priority, reason, assignment_id
 *      - Creates request with PENDING status
 *
 * RELATED ENDPOINTS:
 * - POST /api/engineer-app/part-requests/{id}/cancel   - Cancel pending request
 * - POST /api/engineer-app/part-requests/{id}/delivered - Confirm delivery
 * - PATCH /api/admin/part-requests/{id}                - Admin actions (approve/reject/dispatch)
 *
 * STATUS TRANSITIONS:
 * - PENDING → APPROVED (by admin)
 * - PENDING → REJECTED (by admin)
 * - PENDING → CANCELLED (by engineer)
 * - APPROVED → DISPATCHED (by admin)
 * - DISPATCHED → DELIVERED (by engineer)
 *
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireEngineerMobile } from "@/server/auth/rbac";
import { PartRequestStatus, PartRequestPriority } from "@prisma/client";

/**
 * GET /api/engineer-app/part-requests
 *
 * Fetch part requests for the logged-in engineer.
 *
 * Query Parameters:
 * - status: Filter by status (pending, approved, rejected, dispatched, delivered, cancelled)
 *           Use "all" or omit for no filter
 *
 * Response:
 * - data: Array of transformed part requests
 * - summary: Object with counts for each status (for UI badges)
 *
 */
export async function GET(request: NextRequest) {
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
}

/**
 * POST /api/engineer-app/part-requests
 *
 * Create a new part request for a service engineer.
 *
 * Request Body:
 * - part_id (required): ID of the part to request
 * - quantity (optional, default: 1): Number of units needed
 * - priority (optional, default: "medium"): "low" | "medium" | "high" | "urgent"
 * - reason (optional): Text explaining why the part is needed
 * - assignment_id (optional): Link request to a specific job assignment
 *
 * Process:
 * 1. Validates part exists
 * 2. Validates assignment belongs to engineer (if provided)
 * 3. Creates request with PENDING status
 * 4. Admin receives notification to review
 *
 * Response:
 * - data: Created request with part details
 *
 */
export async function POST(request: NextRequest) {
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
}
