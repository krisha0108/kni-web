import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { serviceItemSchema } from "@/server/validators/catalog";

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
      db.serviceItem.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          subCategory: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.serviceItem.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get services error:", error);
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
    const validation = serviceItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const service = await db.serviceItem.create({
      data: {
        name: validation.data.name,
        description: validation.data.description || null,
        price: validation.data.price,
        categoryId: validation.data.categoryId,
        subCategoryId: validation.data.subCategoryId || null,
        isActive: true,
      },
    });

    return NextResponse.json({ ok: true, data: service });
  } catch (error) {
    console.error("Create service error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
