import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  imageUrl: z.string().optional().or(z.literal("")),
  unit: z.string().min(1, "Unit is required"),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  marketplaceCategoryId: z.string().min(1, "Category is required"),
  marketplaceSubCategoryId: z.string().optional(),
});

// GET /api/admin/marketplace/products - List all marketplace products
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status"); // "active" | "inactive" | "all"
    const categoryId = searchParams.get("categoryId");
    const subCategoryId = searchParams.get("subCategoryId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: any = {
      deletedAt: null,
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      } : {}),
      ...(status === "active" ? { isActive: true } : {}),
      ...(status === "inactive" ? { isActive: false } : {}),
      ...(categoryId ? { marketplaceCategoryId: categoryId } : {}),
      ...(subCategoryId ? { marketplaceSubCategoryId: subCategoryId } : {}),
    };

    const [products, total] = await Promise.all([
      db.marketplaceProduct.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true },
          },
          marketplaceCategory: {
            select: { id: true, name: true },
          },
          marketplaceSubCategory: {
            select: { id: true, name: true },
          },
          _count: {
            select: { vendorProducts: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.marketplaceProduct.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        items: products,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Get marketplace products error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

// POST /api/admin/marketplace/products - Create a new marketplace product
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const validation = createProductSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, imageUrl, unit, description, isActive, marketplaceCategoryId, marketplaceSubCategoryId } = validation.data;

    // Verify category exists
    const category = await db.marketplaceCategory.findUnique({
      where: { id: marketplaceCategoryId },
    });

    if (!category || category.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Verify subcategory exists and belongs to the category if provided
    if (marketplaceSubCategoryId) {
      const subCategory = await db.marketplaceSubCategory.findFirst({
        where: {
          id: marketplaceSubCategoryId,
          categoryId: marketplaceCategoryId,
          deletedAt: null,
        },
      });

      if (!subCategory) {
        return NextResponse.json(
          { ok: false, error: "Subcategory not found or does not belong to selected category" },
          { status: 404 }
        );
      }
    }

    // Check for duplicate product name
    const existingProduct = await db.marketplaceProduct.findFirst({
      where: {
        name: { equals: name },
        deletedAt: null,
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { ok: false, error: "A product with this name already exists" },
        { status: 400 }
      );
    }

    const product = await db.marketplaceProduct.create({
      data: {
        name,
        imageUrl: imageUrl || null,
        unit,
        description: description || null,
        isActive: isActive ?? true,
        marketplaceCategoryId,
        marketplaceSubCategoryId: marketplaceSubCategoryId || null,
        createdBy: session.id,
      },
      include: {
        creator: {
          select: { id: true, name: true },
        },
        marketplaceCategory: {
          select: { id: true, name: true },
        },
        marketplaceSubCategory: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: product,
    });
  } catch (error) {
    console.error("Create marketplace product error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
