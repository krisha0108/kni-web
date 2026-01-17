import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/rbac";

// GET /api/owner/equipment/[id] - Get individual equipment details with service history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner();
    const { id: equipmentId } = await params;

    const equipment = await db.equipment.findFirst({
      where: {
        id: equipmentId,
        ownerId: session.id,
        deletedAt: null,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        equipmentType: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            serviceTemplates: {
              where: { isActive: true },
              orderBy: [{ isCommon: "desc" }, { sortOrder: "asc" }],
              take: 10,
            },
          },
        },
        // Service history - bookings linked to this equipment
        serviceBookings: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            engineerAssignments: {
              include: {
                engineer: {
                  select: { id: true, name: true },
                },
                workLog: {
                  select: {
                    id: true,
                    completionNote: true,
                    createdAt: true,
                  },
                },
              },
            },
            items: {
              include: {
                serviceItem: { select: { id: true, name: true } },
                partItem: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { ok: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    // Calculate total spend from completed bookings
    const completedBookings = equipment.serviceBookings.filter(
      (b) => b.status === "COMPLETED"
    );
    const totalSpend = completedBookings.reduce((sum, b) => sum + b.totalAmount, 0);

    return NextResponse.json({
      ok: true,
      data: {
        ...equipment,
        serviceHistory: equipment.serviceBookings,
        totalSpend,
        completedServicesCount: completedBookings.length,
      },
    });
  } catch (error) {
    console.error("Get equipment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
