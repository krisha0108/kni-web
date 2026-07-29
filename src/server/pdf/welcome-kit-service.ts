import PDFDocument from "pdfkit";
import { db } from "@/server/db";
import {
  COMPANY_INFO,
  BRAND_RED,
  BRAND_DARK,
  PAGE_LEFT,
  PAGE_WIDTH,
  drawColoredHeader,
  drawFooter,
  pdfToBuffer,
} from "./invoice-service";

const POSITION_LABELS: Record<string, string> = {
  TECHNICIAN_MECHANICAL: "Service Technician – Mechanical",
  TECHNICIAN_ELECTRICAL: "Service Technician – Electrical",
  TECHNICIAN_ELECTRONIC: "Service Technician – Electronic",
  TECHNICIAN_REFRIGERATION: "Service Technician – Refrigeration",
  TECHNICIAN_INDUCTION: "Service Technician – Induction Equipment",
  TECHNICIAN_COMMERCIAL_KITCHEN: "Service Technician – Complete Commercial Kitchen Equipment",
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Generate the "Digital Welcome Kit" PDF for a newly-registered technician.
 */
export async function generateWelcomeKit(candidateId: string): Promise<Buffer> {
  const candidate = await db.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error("Candidate not found");
  if (!candidate.registrationId) throw new Error("Candidate has not completed registration payment yet");

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const bufferPromise = pdfToBuffer(doc);

  drawColoredHeader(doc, "WELCOME TO KNI SERVICES", "Digital Welcome Kit");

  const contentY = 150;

  doc.fillColor(BRAND_DARK).fontSize(16).font("Helvetica-Bold").text(
    `Welcome, ${candidate.fullName}!`,
    PAGE_LEFT,
    contentY
  );

  doc.fillColor("#333333").fontSize(11).font("Helvetica").text(
    "Congratulations on becoming a registered KNI Services Technician. You are now part of a growing " +
      "network of skilled professionals serving commercial kitchens across India.",
    PAGE_LEFT,
    contentY + 30,
    { width: PAGE_WIDTH, lineGap: 4 }
  );

  const detailsY = contentY + 100;
  const labelColX = PAGE_LEFT + 15;
  const labelColWidth = 130;
  const valueColX = labelColX + labelColWidth;
  const valueColWidth = PAGE_LEFT + PAGE_WIDTH - 15 - valueColX;
  const rowGap = 6;

  const rows: [string, string][] = [
    ["Technician ID", candidate.registrationId],
    ["Full Name", candidate.fullName],
    ["Position", POSITION_LABELS[candidate.position] || candidate.position],
    ["City", `${candidate.city}, ${candidate.state}`],
    ["Registered On", formatDate(candidate.updatedAt)],
    ["Status", "Active — Membership Confirmed"],
  ];

  // Each row's height depends on how many lines its value wraps to (e.g. long
  // position titles) — measure first so rows never overlap, instead of a
  // fixed per-row offset that assumed every value fits on one line.
  doc.fontSize(10).font("Helvetica");
  const rowHeights = rows.map(([, value]) =>
    Math.max(16, doc.heightOfString(value, { width: valueColWidth }))
  );
  const headingHeight = 30;
  const boxHeight =
    headingHeight + rowHeights.reduce((sum, h) => sum + h + rowGap, 0) + 10;

  doc.rect(PAGE_LEFT, detailsY, PAGE_WIDTH, boxHeight).fill("#F8F9FA").stroke("#DEE2E6");
  doc.fillColor(BRAND_DARK).fontSize(11).font("Helvetica-Bold").text("Membership Details", labelColX, detailsY + 12);

  let rowY = detailsY + headingHeight;
  rows.forEach(([label, value], i) => {
    doc.fillColor("#333333").fontSize(10).font("Helvetica-Bold").text(`${label}:`, labelColX, rowY, { width: labelColWidth });
    doc.font("Helvetica").text(value, valueColX, rowY, { width: valueColWidth });
    rowY += rowHeights[i] + rowGap;
  });

  const nextStepsY = detailsY + boxHeight + 20;
  doc.fillColor(BRAND_RED).fontSize(12).font("Helvetica-Bold").text("What's Next?", PAGE_LEFT, nextStepsY);
  doc.fillColor("#333333").fontSize(10).font("Helvetica").text(
    "• Your ServiceEngineerApp login credentials have been sent to your registered email.\n" +
      "• Watch for training/seminar invitations — attending them activates your technician account for live service jobs.\n" +
      "• Keep your documents and profile up to date via the KNI Services team.",
    PAGE_LEFT,
    nextStepsY + 20,
    { width: PAGE_WIDTH, lineGap: 6 }
  );

  drawFooter(doc, [
    "1. This Technician ID is your unique identifier with KNI Services — keep it for your records.",
    "2. Contact the KNI Services recruitment team for any queries regarding your registration.",
    `3. ${COMPANY_INFO.name} | ${COMPANY_INFO.website}`,
  ]);

  doc.end();
  return bufferPromise;
}
