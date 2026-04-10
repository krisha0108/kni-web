import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const subCategorySchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

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
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search") || "";
    const includeInactive = searchParams.get("includeInactive") === "true";

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {};
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (search) {
      where.name = { contains: search };
    }
    if (!includeInactive) {
      where.isActive = true;
    }

    const [subCategories, total] = await Promise.all([
      db.marketplaceSubCategory.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
          _count: {
            select: { products: true },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.marketplaceSubCategory.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items: subCategories, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get marketplace subcategories error:", error);
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
    const validation = subCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await db.marketplaceCategory.findUnique({
      where: { id: validation.data.categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { ok: false, error: "Category not found" },
        { status: 404 }
      );
    }

    const slug = generateSlug(validation.data.name);

    // Check for duplicate within same category
    const existing = await db.marketplaceSubCategory.findFirst({
      where: {
        categoryId: validation.data.categoryId,
        slug,
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Subcategory with this name already exists in this category" },
        { status: 409 }
      );
    }

    const subCategory = await db.marketplaceSubCategory.create({
      data: {
        categoryId: validation.data.categoryId,
        name: validation.data.name,
        slug,
        imageUrl: validation.data.imageUrl || null,
        isActive: validation.data.isActive ?? true,
        sortOrder: validation.data.sortOrder ?? 0,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ ok: true, data: subCategory });
  } catch (error) {
    console.error("Create marketplace subcategory error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
