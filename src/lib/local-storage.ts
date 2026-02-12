import fs from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

// Directory where uploaded images will be stored
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Save uploaded file to local file system
 * @param file - The file to upload
 * @param folder - Optional subfolder (e.g., "payment-qr", "payment-proofs")
 * @returns Object with url and filename
 */
export async function saveToLocalStorage(
  file: File,
  folder?: string
): Promise<{ url: string; filename: string }> {
  await ensureUploadDir();

  // Generate unique filename
  const timestamp = Date.now();
  const randomString = randomBytes(8).toString("hex");
  const ext = path.extname(file.name);
  const filename = `${timestamp}-${randomString}${ext}`;

  // Create subfolder if specified
  let uploadPath = UPLOAD_DIR;
  if (folder) {
    uploadPath = path.join(UPLOAD_DIR, folder);
    try {
      await fs.access(uploadPath);
    } catch {
      await fs.mkdir(uploadPath, { recursive: true });
    }
  }

  // Convert file to buffer and save
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = path.join(uploadPath, filename);
  await fs.writeFile(filePath, buffer);

  // Return public URL
  const url = folder
    ? `/uploads/${folder}/${filename}`
    : `/uploads/${filename}`;

  return { url, filename };
}

/**
 * Delete file from local storage
 * @param url - The public URL of the file
 */
export async function deleteFromLocalStorage(url: string): Promise<void> {
  try {
    // Validate URL to prevent path traversal attacks
    if (!url.startsWith("/uploads/")) {
      console.error("Invalid delete URL: must start with /uploads/");
      return;
    }
    if (url.includes("..") || url.includes("\\")) {
      console.error("Invalid delete URL: path traversal detected");
      return;
    }

    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    const relativePath = url.replace(/^\//, "");
    const filePath = path.resolve(process.cwd(), "public", relativePath);

    // Ensure resolved path is inside uploads directory
    if (!filePath.startsWith(uploadsDir)) {
      console.error("Invalid delete URL: resolved path outside uploads dir");
      return;
    }

    await fs.unlink(filePath);
  } catch (error) {
    console.error("Error deleting file:", error);
    // Don't throw - file might already be deleted
  }
}
