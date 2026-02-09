import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";

// DELETE /api/owner/category-request/[id] - Delete a pending category request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwnerMobile(request);
    const { id } = await params;

    // Find the category request
    const categoryRequest = await db.categoryRequest.findFirst({
      where: {
        id,
        ownerId: session.id,
      },
    });

    if (!categoryRequest) {
      return NextResponse.json(
        { ok: false, error: "Request not found" },
        { status: 404 }
      );
    }

    // Only allow deletion of pending requests
    if (categoryRequest.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: "Only pending requests can be deleted" },
        { status: 400 }
      );
    }

    // Delete the request
    await db.categoryRequest.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: "Category request deleted successfully",
    });
  } catch (error) {
    console.error("Delete category request error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
