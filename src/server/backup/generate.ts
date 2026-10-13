/**
 * Generic, reflection-driven backup generator. Streams rows out of Prisma
 * in batches (never a single unbounded `findMany()`), and pipes them
 * straight into an Excel / CSV / JSON / ZIP writer that is itself piped to
 * the HTTP response — nothing is held fully in memory except a single
 * module's worth of data when building the "Full Backup" ZIP (bounded by
 * module size, not total DB size; see modules.ts).
 */
import ExcelJS from "exceljs";
import { ZipArchive } from "archiver";
import { PassThrough, Readable, Transform } from "stream";
import { db } from "@/server/db";
import type { BackupModule, BackupTable } from "./modules";

const BATCH_SIZE = 500;

type ModelDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
};

function getDelegate(model: string): ModelDelegate {
  return (db as unknown as Record<string, ModelDelegate>)[model];
}

async function* streamRows(model: string, batchSize = BATCH_SIZE): AsyncGenerator<Record<string, unknown>[]> {
  const delegate = getDelegate(model);
  let skip = 0;
  for (;;) {
    const batch = await delegate.findMany({ skip, take: batchSize, orderBy: { id: "asc" } });
    if (batch.length === 0) return;
    yield batch;
    if (batch.length < batchSize) return;
    skip += batchSize;
  }
}

function isDecimalLike(value: unknown): value is { toString(): string } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { constructor?: { name?: string } }).constructor?.name === "Decimal"
  );
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (isDecimalLike(value)) return value.toString();
  return value;
}

function rowToPlainRecord(row: Record<string, unknown>, excludeFields?: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (excludeFields?.includes(key)) continue;
    result[key] = normalizeValue(value);
  }
  return result;
}

function toCellValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

class ByteCounterTransform extends Transform {
  bytes = 0;
  _transform(chunk: Buffer, _enc: BufferEncoding, callback: (error?: Error | null, data?: Buffer) => void) {
    this.bytes += chunk.length;
    callback(null, chunk);
  }
}

/** Pipes a Node Readable/Transform source into a web ReadableStream for the
 * Next.js Response body, while tracking total bytes written for BackupLog. */
function toWebWithSize(source: Readable): { webStream: ReadableStream; sizePromise: Promise<number> } {
  const counter = new ByteCounterTransform();
  source.pipe(counter);
  source.on("error", (err) => counter.destroy(err));

  let settled = false;
  const sizePromise = new Promise<number>((resolve, reject) => {
    counter.on("end", () => {
      if (!settled) {
        settled = true;
        resolve(counter.bytes);
      }
    });
    counter.on("close", () => {
      if (!settled) {
        settled = true;
        resolve(counter.bytes);
      }
    });
    counter.on("error", (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
  });

  const webStream = Readable.toWeb(counter) as unknown as ReadableStream;
  return { webStream, sizePromise };
}

async function writeTableCsvToSink(table: BackupTable, sink: PassThrough): Promise<void> {
  let headerWritten = false;
  let wroteAny = false;
  for await (const batch of streamRows(table.model)) {
    for (const row of batch) {
      const plain = rowToPlainRecord(row, table.excludeFields);
      if (!headerWritten) {
        sink.write(Object.keys(plain).map(csvEscape).join(",") + "\n");
        headerWritten = true;
      }
      sink.write(Object.values(plain).map(csvEscape).join(",") + "\n");
      wroteAny = true;
    }
  }
  if (!wroteAny) sink.write("No records\n");
  sink.end();
}

async function writeModuleExcelToSink(tables: BackupTable[], sink: PassThrough): Promise<void> {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: sink,
    useStyles: false,
    useSharedStrings: false,
  });

  for (const table of tables) {
    const sheet = workbook.addWorksheet(table.label.slice(0, 31));
    let headerWritten = false;
    for await (const batch of streamRows(table.model)) {
      for (const row of batch) {
        const plain = rowToPlainRecord(row, table.excludeFields);
        if (!headerWritten) {
          sheet.columns = Object.keys(plain).map((key) => ({ header: key, key, width: 20 }));
          headerWritten = true;
        }
        const cellRow: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(plain)) cellRow[key] = toCellValue(value);
        sheet.addRow(cellRow).commit();
      }
    }
    if (!headerWritten) {
      sheet.columns = [{ header: "info", key: "info", width: 30 }];
      sheet.addRow({ info: "No records" }).commit();
    }
    sheet.commit();
  }

  await workbook.commit();
}

async function writeModuleJsonToSink(tables: BackupTable[], sink: PassThrough): Promise<void> {
  sink.write("{");
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    sink.write(`${i > 0 ? "," : ""}${JSON.stringify(table.label)}:[`);
    let first = true;
    for await (const batch of streamRows(table.model)) {
      for (const row of batch) {
        const plain = rowToPlainRecord(row, table.excludeFields);
        sink.write(`${first ? "" : ","}${JSON.stringify(plain)}`);
        first = false;
      }
    }
    sink.write("]");
  }
  sink.write("}");
  sink.end();
}

function runToSink(writer: (sink: PassThrough) => Promise<void>): { webStream: ReadableStream; sizePromise: Promise<number> } {
  const sink = new PassThrough();
  const { webStream, sizePromise } = toWebWithSize(sink);
  writer(sink).catch((err) => sink.destroy(err instanceof Error ? err : new Error(String(err))));
  return { webStream, sizePromise };
}

async function bufferFromSink(writer: (sink: PassThrough) => Promise<void>): Promise<Buffer> {
  const sink = new PassThrough();
  const chunks: Buffer[] = [];
  sink.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<void>((resolve, reject) => {
    sink.on("end", resolve);
    sink.on("error", reject);
  });
  await writer(sink);
  await done;
  return Buffer.concat(chunks);
}

export function generateTableCsv(table: BackupTable) {
  return runToSink((sink) => writeTableCsvToSink(table, sink));
}

export function generateModuleExcel(tables: BackupTable[]) {
  return runToSink((sink) => writeModuleExcelToSink(tables, sink));
}

export function generateModuleJson(tables: BackupTable[]) {
  return runToSink((sink) => writeModuleJsonToSink(tables, sink));
}

export function generateFullBackupZip(modules: BackupModule[]) {
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("warning", () => {});
  const { webStream, sizePromise } = toWebWithSize(archive);

  (async () => {
    try {
      for (const mod of modules) {
        const [xlsxBuf, jsonBuf] = await Promise.all([
          bufferFromSink((sink) => writeModuleExcelToSink(mod.tables, sink)),
          bufferFromSink((sink) => writeModuleJsonToSink(mod.tables, sink)),
        ]);
        archive.append(xlsxBuf, { name: `${mod.key}/${mod.key}.xlsx` });
        archive.append(jsonBuf, { name: `${mod.key}/${mod.key}.json` });
      }
      await archive.finalize();
    } catch (err) {
      archive.destroy(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return { webStream, sizePromise };
}

export async function recordBackupLog(params: {
  module: string;
  format: string;
  tableKey?: string;
  generatedById: string;
  status: "COMPLETED" | "FAILED";
  fileSizeBytes?: number;
  errorMessage?: string;
}): Promise<void> {
  try {
    await db.backupLog.create({
      data: {
        module: params.module,
        format: params.format,
        tableKey: params.tableKey,
        generatedById: params.generatedById,
        status: params.status,
        fileSizeBytes: params.fileSizeBytes,
        errorMessage: params.errorMessage,
      },
    });
  } catch (err) {
    console.error("Failed to write BackupLog", err);
  }
}
