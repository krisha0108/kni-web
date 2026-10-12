import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const positionSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.string().optional(),
  externalApplyUrl: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: any = { deletedAt: null };
    if (search) {
      where.title = { contains: search };
    }
    if (!includeInactive) {
      where.isActive = true;
    }

    const positions = await db.jobPosition.findMany({
      where,
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });

    return NextResponse.json({ ok: true, data: positions });
  } catch (error) {
    console.error("Get job positions error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = positionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const slug = generateSlug(validation.data.title);

    const existing = await db.jobPosition.findFirst({
      where: { slug, deletedAt: null },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "A position with this title already exists" },
        { status: 409 }
      );
    }

    const position = await db.jobPosition.create({
      data: {
        title: validation.data.title,
        slug,
        description: validation.data.description || null,
        department: validation.data.department || null,
        location: validation.data.location || null,
        employmentType: validation.data.employmentType || null,
        externalApplyUrl: validation.data.externalApplyUrl || null,
        isActive: validation.data.isActive ?? true,
        sortOrder: validation.data.sortOrder ?? 0,
      },
    });

    return NextResponse.json({ ok: true, data: position });
  } catch (error) {
    console.error("Create job position error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
