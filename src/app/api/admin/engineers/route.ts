import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET() {
  try {
    await requireAdmin();

    const engineers = await db.user.findMany({
      where: {
        role: "ENGINEER",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ ok: true, data: engineers });
  } catch (error) {
    console.error("Get engineers error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
