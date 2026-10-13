import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET() {
  try {
    await requireAdmin();

    const logs = await db.backupLog.findMany({
      include: { generatedBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ ok: true, data: logs });
  } catch (error) {
    console.error("Backup history error:", error);
    return NextResponse.json({ ok: false, error: "Failed to load backup history" }, { status: 500 });
  }
}
