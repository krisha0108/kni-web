import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getBackupModule, getBackupTable } from "@/server/backup/modules";
import { generateModuleExcel, generateModuleJson, generateTableCsv, recordBackupLog } from "@/server/backup/generate";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const moduleKey = searchParams.get("module");
  const tableKey = searchParams.get("table");
  const format = searchParams.get("format");

  if (!moduleKey || !format) {
    return NextResponse.json({ error: "module and format are required" }, { status: 400 });
  }

  const mod = getBackupModule(moduleKey);
  if (!mod) {
    return NextResponse.json({ error: "Unknown module" }, { status: 404 });
  }

  const date = new Date().toISOString().split("T")[0];

  try {
    if (format === "csv") {
      if (!tableKey) {
        return NextResponse.json({ error: "table is required for CSV export" }, { status: 400 });
      }
      const table = getBackupTable(moduleKey, tableKey);
      if (!table) {
        return NextResponse.json({ error: "Unknown table" }, { status: 404 });
      }
      const { webStream, sizePromise } = generateTableCsv(table);
      sizePromise
        .then((fileSizeBytes) =>
          recordBackupLog({ module: moduleKey, format, tableKey, generatedById: session.id, status: "COMPLETED", fileSizeBytes })
        )
        .catch((err) =>
          recordBackupLog({ module: moduleKey, format, tableKey, generatedById: session.id, status: "FAILED", errorMessage: String(err?.message || err) })
        );
      return new NextResponse(webStream, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="kni-${moduleKey}-${table.key}-${date}.csv"`,
        },
      });
    }

    if (format === "xlsx") {
      const { webStream, sizePromise } = generateModuleExcel(mod.tables);
      sizePromise
        .then((fileSizeBytes) =>
          recordBackupLog({ module: moduleKey, format, generatedById: session.id, status: "COMPLETED", fileSizeBytes })
        )
        .catch((err) =>
          recordBackupLog({ module: moduleKey, format, generatedById: session.id, status: "FAILED", errorMessage: String(err?.message || err) })
        );
      return new NextResponse(webStream, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="kni-${moduleKey}-${date}.xlsx"`,
        },
      });
    }

    if (format === "json") {
      const { webStream, sizePromise } = generateModuleJson(mod.tables);
      sizePromise
        .then((fileSizeBytes) =>
          recordBackupLog({ module: moduleKey, format, generatedById: session.id, status: "COMPLETED", fileSizeBytes })
        )
        .catch((err) =>
          recordBackupLog({ module: moduleKey, format, generatedById: session.id, status: "FAILED", errorMessage: String(err?.message || err) })
        );
      return new NextResponse(webStream, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="kni-${moduleKey}-${date}.json"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (error) {
    console.error("Backup export error:", error);
    await recordBackupLog({
      module: moduleKey,
      format,
      tableKey: tableKey || undefined,
      generatedById: session.id,
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to generate backup" }, { status: 500 });
  }
}
