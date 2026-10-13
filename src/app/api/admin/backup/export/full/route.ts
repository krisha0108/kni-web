import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { BACKUP_MODULES } from "@/server/backup/modules";
import { generateFullBackupZip, recordBackupLog } from "@/server/backup/generate";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { webStream, sizePromise } = generateFullBackupZip(BACKUP_MODULES);
    sizePromise
      .then((fileSizeBytes) =>
        recordBackupLog({ module: "FULL", format: "zip", generatedById: session.id, status: "COMPLETED", fileSizeBytes })
      )
      .catch((err) =>
        recordBackupLog({ module: "FULL", format: "zip", generatedById: session.id, status: "FAILED", errorMessage: String(err?.message || err) })
      );

    const date = new Date().toISOString().split("T")[0];
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="kni-full-backup-${date}.zip"`,
      },
    });
  } catch (error) {
    console.error("Full backup export error:", error);
    await recordBackupLog({
      module: "FULL",
      format: "zip",
      generatedById: session.id,
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to generate full backup" }, { status: 500 });
  }
}
