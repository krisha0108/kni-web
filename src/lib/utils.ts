import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amountInPaise: number | undefined | null): string {
  // Handle invalid or missing values
  if (amountInPaise === undefined || amountInPaise === null || isNaN(amountInPaise)) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(0);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amountInPaise / 100);
}

// Alias for formatCurrency to match the README documentation
export function formatPrice(amountInPaise: number | undefined | null): string {
  return formatCurrency(amountInPaise);
}

export function formatDate(date: Date | string): string {
  if (!date) return "-";
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(dateObj);
}

export function formatDateTime(date: Date | string): string {
  if (!date) return "-";
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; total: number; page: number; pageSize: number; totalPages: number } {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedItems = items.slice(start, start + pageSize);
  return { items: paginatedItems, total, page, pageSize, totalPages };
}
