import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export interface UploadResult {
  url: string;
  filename: string;
}

export async function saveUploadedFile(
  file: File,
  type: "payment" | "engineer-proof"
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Only PNG, JPG, and WebP are allowed.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 5MB limit.");
  }

  const now = new Date();
  const yearMonth = now.toISOString().slice(0, 7); // YYYY-MM
  const uploadDir = path.join(UPLOAD_DIR, type, yearMonth);

  await mkdir(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop() || "png";
  const filename = Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;
  const filepath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  const url = "/uploads/" + type + "/" + yearMonth + "/" + filename;
  return { url, filename };
}
