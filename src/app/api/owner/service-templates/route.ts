import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireOwnerMobile(request);

    try {
      // Try to fetch service templates from database
      const templates = await db.serviceItem.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
        },
        take: 20,
      });

      if (templates.length > 0) {
        return NextResponse.json({
          ok: true,
          data: templates.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description || "",
            estimatedPrice: t.price || 0,
          })),
        });
      }

      // No templates found — return empty array
      return NextResponse.json({
        ok: true,
        data: [],
      });
    } catch (dbError) {
      console.error("Database error fetching service templates:", dbError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch service templates" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching service templates:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch service templates" }, { status: 500 });
  }
}
