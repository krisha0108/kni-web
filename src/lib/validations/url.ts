/**
 * Validate that a URL is a safe image URL.
 * Allows:
 * - Local uploads: /uploads/... (no path traversal)
 * - HTTPS URLs
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  // Allow local uploads (no path traversal)
  if (url.startsWith("/uploads/")) {
    return !url.includes("..") && !url.includes("\\");
  }

  // Allow HTTPS URLs
  if (url.startsWith("https://")) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
