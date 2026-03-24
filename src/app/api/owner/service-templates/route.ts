import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireOwnerMobile } from "@/server/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireOwnerMobile(request);

    try {
      const searchParams = request.nextUrl.searchParams;
      const page = parseInt(searchParams.get("page") || "0");
      const pageSize = parseInt(searchParams.get("pageSize") || "50");
      const where = { isActive: true };

      const [templates, total] = await Promise.all([
        db.serviceItem.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
          },
          ...(page > 0 ? { skip: (page - 1) * pageSize, take: pageSize } : { take: pageSize }),
        }),
        db.serviceItem.count({ where }),
      ]);

      const mapped = templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description || "",
        estimatedPrice: t.price || 0,
      }));

      return NextResponse.json({
        ok: true,
        data: page > 0 ? { items: mapped, total, page, pageSize } : mapped,
        total,
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
