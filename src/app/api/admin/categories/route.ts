import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { categorySchema } from "@/server/validators/catalog";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where = {
      deletedAt: null,
      ...(search ? { name: { contains: search } } : {}),
    };

    const [items, total] = await Promise.all([
      db.category.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.category.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items, total, page, pageSize },
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
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

    const existing = await db.category.findFirst({
      where: { name: validation.data.name, deletedAt: null },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Category with this name already exists" },
        { status: 409 }
      );
    }

    // Restore soft-deleted record if exists (avoids unique constraint conflict)
    const softDeleted = await db.category.findFirst({
      where: { name: validation.data.name, deletedAt: { not: null } },
    });

    if (softDeleted) {
      const restored = await db.category.update({
        where: { id: softDeleted.id },
        data: { name: validation.data.name, isActive: true, deletedAt: null },
      });
      return NextResponse.json({ ok: true, data: restored });
    }

    const category = await db.category.create({
      data: {
        name: validation.data.name,
        isActive: true,
      },
    });

    return NextResponse.json({ ok: true, data: category });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
