import { createWorker } from "tesseract.js";

// Runs OCR on an image buffer server-side (Node build of tesseract.js) so a
// salesman's phone never has to do the heavy lifting itself. English-only —
// visiting cards in this business are expected to be in English/Latin script.
export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

export interface ParsedCardFields {
  email: string | null;
  phone: string | null;
  altPhone: string | null;
  website: string | null;
  gstNumber: string | null;
  rawText: string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Indian mobile numbers: 10 digits starting 6-9, optionally prefixed +91/91/0.
const PHONE_RE = /(?:\+?91[\s-]?|0)?\b([6-9]\d{9})\b/g;
const WEBSITE_RE = /\b((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.(?:com|in|co\.in|net|org|biz|io)(?:\/[^\s,]*)?)\b/gi;
// India GSTIN: 2-digit state code + 10-char PAN + 1-digit entity code + 'Z' + 1 checksum char.
const GST_RE = /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g;

/**
 * Only extracts fields that have a fixed, unambiguous pattern (email, phone,
 * website, GST number) — deliberately does NOT attempt to guess Company
 * Name / Contact Person / Designation / Address, since free OCR text has no
 * layout information and guessing those wrong is worse than not guessing at
 * all. `rawText` is returned so the UI can show it for quick manual entry
 * of those remaining fields.
 */
export function parseCardFields(rawText: string): ParsedCardFields {
  const emailMatches = [...rawText.matchAll(EMAIL_RE)].map((m) => m[0]);
  const email = emailMatches[0] || null;

  // Strip matched emails before hunting for a website so an email's domain
  // doesn't get double-counted as a separate website.
  const textWithoutEmails = emailMatches.reduce(
    (text, e) => text.replace(e, " "),
    rawText
  );
  const websiteMatches = [...textWithoutEmails.matchAll(WEBSITE_RE)].map((m) => m[1]);
  const website = websiteMatches[0] || null;

  const phoneMatches = [...rawText.matchAll(PHONE_RE)].map((m) => m[1]);
  const uniquePhones = [...new Set(phoneMatches)];
  const phone = uniquePhones[0] || null;
  const altPhone = uniquePhones[1] || null;

  const gstMatches = [...rawText.matchAll(GST_RE)].map((m) => m[0]);
  const gstNumber = gstMatches[0] || null;

  return { email, phone, altPhone, website, gstNumber, rawText };
}
