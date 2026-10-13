import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { BACKUP_MODULES } from "@/server/backup/modules";

type ModelDelegate = { count: () => Promise<number> };

export async function GET() {
  try {
    await requireAdmin();

    const data = await Promise.all(
      BACKUP_MODULES.map(async (mod) => ({
        key: mod.key,
        label: mod.label,
        description: mod.description,
        tables: await Promise.all(
          mod.tables.map(async (table) => {
            const delegate = (db as unknown as Record<string, ModelDelegate>)[table.model];
            let rowCount = 0;
            try {
              rowCount = await delegate.count();
            } catch {
              rowCount = 0;
            }
            return { key: table.key, label: table.label, rowCount };
          })
        ),
      }))
    );

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("Backup modules list error:", error);
    return NextResponse.json({ ok: false, error: "Failed to load backup modules" }, { status: 500 });
  }
}
