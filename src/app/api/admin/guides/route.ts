import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const guideSchema = z.object({
  thumbUrl: z.string().url("Must be a valid URL"),
  title: z.string().min(3),
  description: z.string().optional(),
  minutes: z.number().int().min(0).default(0),
  linkUrl: z.string().url("Must be a valid URL"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get("isActive");
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 20;

    const where: any = {};
    if (isActive !== null) where.isActive = isActive === "true";

    const [guides, total] = await Promise.all([
      db.guide.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.guide.count({ where }),
    ]);

    return NextResponse.json({ ok: true, data: { items: guides, total, page, pageSize } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = guideSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ ok: false, error: validation.error.issues[0].message }, { status: 400 });
    }

    const guide = await db.guide.create({ data: validation.data });
    return NextResponse.json({ ok: true, data: guide });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
