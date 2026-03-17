import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const inquiry = await db.launchPadInquiry.findUnique({
      where: { id },
    });

    if (!inquiry) {
      return NextResponse.json(
        { ok: false, error: "Inquiry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: inquiry });
  } catch (error) {
    console.error("Get launchpad inquiry error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    // Get current inquiry for change detection
    const currentInquiry = await db.launchPadInquiry.findUnique({
      where: { id },
    });

    if (!currentInquiry) {
      return NextResponse.json(
        { ok: false, error: "Inquiry not found" },
        { status: 404 }
      );
    }

    const allowedFields = ["status", "priority", "assignedTo", "followUpDate"];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "followUpDate" && body[field]) {
          updateData[field] = new Date(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const inquiry = await db.launchPadInquiry.update({
      where: { id },
      data: updateData,
    });

    // Get admin name for activity logging
    const adminUser = await db.user.findUnique({
      where: { id: admin.id },
      select: { name: true },
    });
    const adminName = adminUser?.name || "Admin";

    // Log status change
    if (body.status && body.status !== currentInquiry.status) {
      await db.launchPadActivityLog.create({
        data: {
          inquiryId: id,
          type: "STATUS_CHANGED",
          description: `Status changed from ${currentInquiry.status.replace(/_/g, " ")} to ${body.status.replace(/_/g, " ")}`,
          metadata: JSON.stringify({ from: currentInquiry.status, to: body.status }),
          performedBy: adminName,
        },
      });
    }

    // Log priority change
    if (body.priority && body.priority !== currentInquiry.priority) {
      await db.launchPadActivityLog.create({
        data: {
          inquiryId: id,
          type: "PRIORITY_CHANGED",
          description: `Priority changed from ${currentInquiry.priority} to ${body.priority}`,
          metadata: JSON.stringify({ from: currentInquiry.priority, to: body.priority }),
          performedBy: adminName,
        },
      });
    }

    return NextResponse.json({ ok: true, data: inquiry });
  } catch (error) {
    console.error("Update launchpad inquiry error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await db.launchPadInquiry.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete launchpad inquiry error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
