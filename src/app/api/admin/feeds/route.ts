import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const feedSchema = z.object({
  text: z.string().min(3, "Text must be at least 3 characters"),
  tone: z.enum(["OK", "INFO", "WARN", "DANGER"]).default("INFO"),
  icon: z.string().optional(),
  linkUrl: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get("isActive");
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 20;

    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const [feeds, total] = await Promise.all([
      db.feed.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.feed.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items: feeds, total, page, pageSize },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = feedSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const feed = await db.feed.create({
      data: {
        text: validation.data.text,
        tone: validation.data.tone,
        icon: validation.data.icon,
        linkUrl: validation.data.linkUrl || null,
        isActive: validation.data.isActive,
      },
    });

    return NextResponse.json({ ok: true, data: feed });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
