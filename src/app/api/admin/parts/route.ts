import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { partItemSchema } from "@/server/validators/catalog";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get("categoryId");
    const subCategoryId = searchParams.get("subCategoryId");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where = {
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
      ...(subCategoryId ? { subCategoryId } : {}),
      ...(search ? { name: { contains: search } } : {}),
    };

    const [items, total] = await Promise.all([
      db.partItem.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          subCategory: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.partItem.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get parts error:", error);
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
    const validation = partItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check active duplicate
    const existing = await db.partItem.findFirst({
      where: {
        name: validation.data.name,
        categoryId: validation.data.categoryId,
        ...(validation.data.subCategoryId ? { subCategoryId: validation.data.subCategoryId } : {}),
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Part with this name already exists" },
        { status: 409 }
      );
    }

    // Restore soft-deleted record if exists
    const softDeleted = await db.partItem.findFirst({
      where: {
        name: validation.data.name,
        categoryId: validation.data.categoryId,
        ...(validation.data.subCategoryId ? { subCategoryId: validation.data.subCategoryId } : {}),
        deletedAt: { not: null },
      },
    });

    if (softDeleted) {
      const restored = await db.partItem.update({
        where: { id: softDeleted.id },
        data: {
          name: validation.data.name,
          description: validation.data.description || null,
          imageUrl: validation.data.imageUrl || null,
          price: validation.data.price,
          categoryId: validation.data.categoryId,
          subCategoryId: validation.data.subCategoryId || null,
          isActive: true,
          deletedAt: null,
        },
      });
      return NextResponse.json({ ok: true, data: restored });
    }

    const part = await db.partItem.create({
      data: {
        name: validation.data.name,
        description: validation.data.description || null,
        imageUrl: validation.data.imageUrl || null,
        price: validation.data.price,
        categoryId: validation.data.categoryId,
        subCategoryId: validation.data.subCategoryId || null,
        isActive: true,
      },
    });

    return NextResponse.json({ ok: true, data: part });
  } catch (error) {
    console.error("Create part error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
