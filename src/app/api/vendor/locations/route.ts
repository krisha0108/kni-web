import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireVendor } from "@/server/auth/rbac";
import { z } from "zod";

export async function GET() {
  try {
    const session = await requireVendor();

    const requests = await db.vendorLocationRequest.findMany({
      where: { vendorId: session.id },
      include: {
        area: {
          select: {
            id: true,
            name: true,
            city: {
              select: {
                id: true,
                name: true,
                state: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      data: { items: requests },
    });
  } catch (error) {
    console.error("Get vendor locations error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

const requestSchema = z.object({
  areaIds: z.array(z.string()).min(1, "Please select at least one area"),
  note: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireVendor();

    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { areaIds, note } = validation.data;

    // Verify areas exist and are active
    const validAreas = await db.serviceArea.findMany({
      where: { id: { in: areaIds }, isActive: true },
    });

    if (validAreas.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid areas selected" },
        { status: 400 }
      );
    }

    // Check for existing requests (pending or approved)
    const existingRequests = await db.vendorLocationRequest.findMany({
      where: {
        vendorId: session.id,
        areaId: { in: validAreas.map((a) => a.id) },
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    const existingAreaIds = new Set(existingRequests.map((r) => r.areaId));
    const newAreaIds = validAreas.filter((a) => !existingAreaIds.has(a.id)).map((a) => a.id);

    if (newAreaIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "All selected areas already have pending or approved requests" },
        { status: 409 }
      );
    }

    // Create new requests
    await db.vendorLocationRequest.createMany({
      data: newAreaIds.map((areaId) => ({
        vendorId: session.id,
        areaId,
        status: "PENDING" as const,
        note: note || null,
      })),
    });

    // Notify admins
    const admins = await db.user.findMany({
      where: { role: "ADMIN", isActive: true },
    });

    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: "New Location Request",
          message: `${session.name} has requested to serve ${newAreaIds.length} new area(s).`,
          linkUrl: "/admin/location-requests",
        })),
      });
    }

    return NextResponse.json({
      ok: true,
      data: { created: newAreaIds.length, skipped: existingAreaIds.size },
    });
  } catch (error) {
    console.error("Create vendor location request error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
