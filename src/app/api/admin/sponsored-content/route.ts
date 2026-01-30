import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";
import { autoUpdateSponsoredContentStatuses } from "@/server/utils/auto-status-update";

const sponsoredSchema = z.object({
  type: z.enum(["VENDOR", "PRODUCT", "SERVICE", "GENERAL"]).default("GENERAL"),
  title: z.string().min(3),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  linkUrl: z.string().optional().or(z.literal("")),
  sponsoredBy: z.string().min(2),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    // Auto-update statuses based on dates before fetching
    await autoUpdateSponsoredContentStatuses();

    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get("isActive");
    const type = searchParams.get("type");
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 20;

    const where: any = {};
    if (isActive !== null) where.isActive = isActive === "true";
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      db.sponsoredContent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.sponsoredContent.count({ where }),
    ]);

    return NextResponse.json({ ok: true, data: { items, total, page, pageSize } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = sponsoredSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ ok: false, error: validation.error.issues[0].message }, { status: 400 });
    }

    const data = validation.data;

    const content = await db.sponsoredContent.create({
      data: {
        type: data.type,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl || null,
        sponsoredBy: data.sponsoredBy,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive,
      },
    });

    return NextResponse.json({ ok: true, data: content });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
