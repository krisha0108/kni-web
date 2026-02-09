import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";
import { VendorLocationRequestStatus } from "@prisma/client";

const updateSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    if (validation.data.status === "REJECTED" && !validation.data.adminNote) {
      return NextResponse.json(
        { ok: false, error: "Reason is required when rejecting a request" },
        { status: 400 }
      );
    }

    const existing = await db.vendorLocationRequest.findUnique({
      where: { id },
      include: {
        vendor: { select: { id: true, name: true } },
        area: {
          select: {
            name: true,
            city: {
              select: {
                name: true,
                state: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Location request not found" },
        { status: 404 }
      );
    }

    if (existing.status !== VendorLocationRequestStatus.PENDING) {
      return NextResponse.json(
        { ok: false, error: "Only pending requests can be updated" },
        { status: 400 }
      );
    }

    const updated = await db.vendorLocationRequest.update({
      where: { id },
      data: {
        status: validation.data.status as VendorLocationRequestStatus,
        adminNote: validation.data.adminNote || null,
      },
    });

    // Send notification to vendor
    const locationName = `${existing.area.name}, ${existing.area.city.name}, ${existing.area.city.state.name}`;
    const isApproved = validation.data.status === "APPROVED";

    await db.notification.create({
      data: {
        userId: existing.vendorId,
        title: isApproved ? "Location Request Approved" : "Location Request Rejected",
        message: isApproved
          ? `Your request to serve ${locationName} has been approved.`
          : `Your request to serve ${locationName} has been rejected. Reason: ${validation.data.adminNote}`,
        linkUrl: "/vendor/locations",
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Update location request error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
