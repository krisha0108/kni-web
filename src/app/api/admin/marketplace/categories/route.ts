import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

// Helper to generate slug
function generateSlug(name: string): string {
  return name
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

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {};
    if (search) {
      where.name = { contains: search };
    }
    if (!includeInactive) {
      where.isActive = true;
    }

    const [categories, total] = await Promise.all([
      db.marketplaceCategory.findMany({
        where,
        include: {
          _count: {
            select: {
              subCategories: true,
              products: true,
              vendorCategories: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.marketplaceCategory.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items: categories, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get marketplace categories error:", error);
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
    const validation = categorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const slug = generateSlug(validation.data.name);

    // Check for duplicate name or slug
    const existing = await db.marketplaceCategory.findFirst({
      where: {
        OR: [{ name: validation.data.name }, { slug }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Category with this name already exists" },
        { status: 409 }
      );
    }

    const category = await db.marketplaceCategory.create({
      data: {
        name: validation.data.name,
        slug,
        imageUrl: validation.data.imageUrl || null,
        isActive: validation.data.isActive ?? true,
        sortOrder: validation.data.sortOrder ?? 0,
      },
    });

    return NextResponse.json({ ok: true, data: category });
  } catch (error) {
    console.error("Create marketplace category error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
