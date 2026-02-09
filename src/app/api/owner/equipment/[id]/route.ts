import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";

// GET /api/owner/equipment/[id] - Get individual equipment details with service history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
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
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subCategory: {
          select: {
            id: true,
            name: true,
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

// PATCH /api/owner/equipment/[id] - Update equipment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id: equipmentId } = await params;
    const body = await request.json();

    // Verify equipment belongs to this owner
    const existing = await db.equipment.findFirst({
      where: {
        id: equipmentId,
        ownerId: session.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    // Only allow updating these fields
    const allowedFields: Record<string, unknown> = {};
    if (body.name !== undefined) allowedFields.name = body.name;
    if (body.brand !== undefined) allowedFields.brand = body.brand;
    if (body.model !== undefined) allowedFields.model = body.model;
    if (body.serialNumber !== undefined) allowedFields.serialNumber = body.serialNumber;
    if (body.purchaseDate !== undefined) allowedFields.purchaseDate = new Date(body.purchaseDate);
    if (body.warrantyEndDate !== undefined) allowedFields.warrantyEndDate = body.warrantyEndDate ? new Date(body.warrantyEndDate) : null;
    if (body.installLocation !== undefined) allowedFields.installLocation = body.installLocation;
    if (body.billImageUrl !== undefined) allowedFields.billImageUrl = body.billImageUrl;
    if (body.warrantyCardUrl !== undefined) allowedFields.warrantyCardUrl = body.warrantyCardUrl;
    if (body.photoUrls !== undefined) allowedFields.photoUrls = body.photoUrls;
    if (body.status !== undefined) allowedFields.status = body.status;
    if (body.notes !== undefined) allowedFields.notes = body.notes;
    if (body.categoryId !== undefined) allowedFields.categoryId = body.categoryId;
    if (body.subCategoryId !== undefined) allowedFields.subCategoryId = body.subCategoryId;

    const updated = await db.equipment.update({
      where: { id: equipmentId },
      data: allowedFields,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Update equipment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

// DELETE /api/owner/equipment/[id] - Soft delete equipment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id: equipmentId } = await params;

    // Verify equipment belongs to this owner
    const existing = await db.equipment.findFirst({
      where: {
        id: equipmentId,
        ownerId: session.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Equipment not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await db.equipment.update({
      where: { id: equipmentId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ ok: true, message: "Equipment deleted successfully" });
  } catch (error) {
    console.error("Delete equipment error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
