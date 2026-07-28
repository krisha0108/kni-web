import PDFDocument from "pdfkit";
import { db } from "@/server/db";
import {
  BRAND_DARK,
  PAGE_LEFT,
  PAGE_WIDTH,
  drawColoredHeader,
  drawInfoBox,
  drawTableHeader,
  drawTableRow,
  drawTotalSection,
  drawFooter,
} from "./invoice-service";

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Format currency in INR
 */
function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date in Indian format
 */
function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Get month name from month number (1-12)
 */
function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return months[month - 1] || "Unknown";
}

/**
 * Convert PDFDocument to buffer by collecting chunks
 */
function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

// ========================================
// PDF GENERATION - EXPENSE RECEIPT
// ========================================

export async function generateExpenseReceipt(expenseId: string): Promise<Buffer> {
  const expense = await db.expense.findUnique({
    where: { id: expenseId },
    include: {
      owner: { select: { name: true } },
      restaurant: {
        select: {
          name: true,
          address: true,
          city: true,
          pincode: true,
        },
      },
    },
  });

  if (!expense) {
    throw new Error("Expense not found");
  }

  // Create PDF document
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const bufferPromise = pdfToBuffer(doc);

  // Receipt Number
  const dateStr = new Date(expense.expenseDate).toISOString().slice(0, 10).replace(/-/g, "");
  const shortId = expense.id.slice(-6).toUpperCase();
  const receiptNumber = `RCP-${dateStr}-${shortId}`;

  // ===== HEADER =====
  drawColoredHeader(doc, "EXPENSE RECEIPT", receiptNumber);

  // ===== INFO BOXES =====
  const metaY = 140;
  const restaurantLines = [
    expense.restaurant.name,
    expense.restaurant.address,
    `${expense.restaurant.city} - ${expense.restaurant.pincode || "N/A"}`,
  ];
  const restaurantHeight = drawInfoBox(doc, PAGE_LEFT, metaY, 240, "RESTAURANT", restaurantLines);

  const detailLines = [
    `Date: ${formatDate(expense.expenseDate)}`,
    `Category: ${expense.category.replace(/_/g, " ")}`,
    `Recorded By: ${expense.owner.name}`,
    `Created: ${formatDate(expense.createdAt)}`,
  ];
  const detailHeight = drawInfoBox(doc, 310, metaY, 235, "RECEIPT DETAILS", detailLines);

  let y = metaY + Math.max(restaurantHeight, detailHeight) + 20;

  // ===== DESCRIPTION =====
  doc.fillColor(BRAND_DARK).fontSize(11).font("Helvetica-Bold").text("Description", PAGE_LEFT, y);
  y += 16;
  doc.fillColor("#333333").fontSize(10).font("Helvetica");
  const descriptionHeight = doc.heightOfString(expense.description, { width: PAGE_WIDTH });
  doc.text(expense.description, PAGE_LEFT, y, { width: PAGE_WIDTH });
  y += Math.max(15, descriptionHeight) + 25;
  doc.fillColor("#000000");

  // ===== TOTAL =====
  drawTotalSection(doc, y, [
    { label: "TOTAL AMOUNT", value: formatCurrency(expense.amount), bold: true },
  ]);

  // ===== FOOTER =====
  drawFooter(doc, [
    "1. This is a computer-generated receipt and does not require a signature.",
    "2. Retain this receipt for your accounting and reimbursement records.",
  ], "receipt");

  // Finalize PDF
  doc.end();

  return bufferPromise;
}

// ========================================
// PDF GENERATION - STAFF SALARY SLIP
// ========================================

export async function generateSalarySlip(salaryId: string): Promise<Buffer> {
  const salary = await db.staffSalary.findUnique({
    where: { id: salaryId },
    include: {
      staff: {
        select: {
          name: true,
          designation: true,
          staffType: true,
          phone: true,
          aadharNumber: true,
        },
      },
      restaurant: {
        select: {
          name: true,
          address: true,
          city: true,
          pincode: true,
        },
      },
    },
  });

  if (!salary) {
    throw new Error("Salary record not found");
  }

  // Create PDF document
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const bufferPromise = pdfToBuffer(doc);

  const monthName = getMonthName(salary.month);
  const slipTitle = `Salary Slip for ${monthName} ${salary.year}`;

  // ===== HEADER =====
  doc.fontSize(20).font("Helvetica-Bold").text(salary.restaurant.name, 50, 50);
  doc.fontSize(10).font("Helvetica").text(salary.restaurant.address);
  doc.text(`${salary.restaurant.city} - ${salary.restaurant.pincode || "N/A"}`);

  // Horizontal line
  doc.moveTo(50, 120).lineTo(550, 120).stroke();

  // ===== TITLE =====
  doc.fontSize(20).font("Helvetica-Bold").text(slipTitle, 50, 140, {
    align: "center",
    width: 500,
  });

  // ===== EMPLOYEE DETAILS =====
  const empTop = 185;
  doc.fontSize(12).font("Helvetica-Bold").text("EMPLOYEE DETAILS:", 50, empTop);

  doc.moveTo(50, empTop + 18).lineTo(550, empTop + 18).stroke();

  let y = empTop + 30;
  const labelX = 50;
  const valueX = 200;
  const labelX2 = 320;
  const valueX2 = 440;

  doc.fontSize(10).font("Helvetica-Bold").text("Name:", labelX, y);
  doc.fontSize(10).font("Helvetica").text(salary.staff.name, valueX, y);
  doc.fontSize(10).font("Helvetica-Bold").text("Staff Type:", labelX2, y);
  doc.fontSize(10).font("Helvetica").text(salary.staff.staffType.replace(/_/g, " "), valueX2, y);

  y += 20;
  doc.fontSize(10).font("Helvetica-Bold").text("Designation:", labelX, y);
  doc.fontSize(10).font("Helvetica").text(salary.staff.designation, valueX, y);
  doc.fontSize(10).font("Helvetica-Bold").text("Month/Year:", labelX2, y);
  doc.fontSize(10).font("Helvetica").text(`${monthName} ${salary.year}`, valueX2, y);

  if (salary.daysWorked !== null && salary.totalDays !== null) {
    y += 20;
    doc.fontSize(10).font("Helvetica-Bold").text("Days Worked:", labelX, y);
    doc.fontSize(10).font("Helvetica").text(
      `${salary.daysWorked} / ${salary.totalDays}`,
      valueX,
      y
    );
  }

  // ===== EARNINGS TABLE =====
  y += 40;
  doc.fontSize(12).font("Helvetica-Bold").text("EARNINGS", 50, y);
  y += 18;
  doc.moveTo(50, y).lineTo(300, y).stroke();

  y += 10;
  doc.fontSize(10).font("Helvetica").text("Basic Salary", 60, y);
  doc.text(formatCurrency(salary.basicSalary), 200, y, { width: 90, align: "right" });

  y += 20;
  doc.text("Allowances", 60, y);
  doc.text(formatCurrency(salary.allowances), 200, y, { width: 90, align: "right" });

  y += 15;
  doc.moveTo(50, y).lineTo(300, y).stroke();

  y += 8;
  doc.font("Helvetica-Bold").text("Gross Earnings", 60, y);
  doc.text(formatCurrency(salary.basicSalary + salary.allowances), 200, y, {
    width: 90,
    align: "right",
  });

  // ===== DEDUCTIONS TABLE =====
  const dedTop = y - 66; // Align with earnings
  doc.fontSize(12).font("Helvetica-Bold").text("DEDUCTIONS", 320, dedTop);
  let dy = dedTop + 18;
  doc.moveTo(320, dy).lineTo(550, dy).stroke();

  dy += 10;
  doc.fontSize(10).font("Helvetica").text("Deductions", 330, dy);
  doc.text(formatCurrency(salary.deductions), 450, dy, { width: 90, align: "right" });

  dy += 35;
  doc.moveTo(320, dy).lineTo(550, dy).stroke();

  dy += 8;
  doc.font("Helvetica-Bold").text("Total Deductions", 330, dy);
  doc.text(formatCurrency(salary.deductions), 450, dy, { width: 90, align: "right" });

  // ===== NET PAY =====
  y += 40;
  doc.moveTo(50, y).lineTo(550, y).stroke();

  y += 15;
  doc.fontSize(16).font("Helvetica-Bold").text("NET PAY (Total Payable):", 50, y);
  doc.text(formatCurrency(salary.totalPayable), 400, y, { width: 150, align: "right" });

  // ===== PAYMENT DETAILS =====
  y += 45;
  doc.fontSize(12).font("Helvetica-Bold").text("PAYMENT DETAILS:", 50, y);

  y += 18;
  doc.moveTo(50, y).lineTo(550, y).stroke();

  y += 10;
  doc.fontSize(10).font("Helvetica-Bold").text("Status:", labelX, y);
  doc.fontSize(10).font("Helvetica").text(salary.status.replace(/_/g, " "), valueX, y);

  y += 20;
  doc.fontSize(10).font("Helvetica-Bold").text("Total Paid:", labelX, y);
  doc.fontSize(10).font("Helvetica").text(formatCurrency(salary.totalPaid), valueX, y);

  const balance = salary.totalPayable - salary.totalPaid;
  y += 20;
  doc.fontSize(10).font("Helvetica-Bold").text("Balance:", labelX, y);
  doc.fontSize(10).font("Helvetica").text(formatCurrency(balance), valueX, y);

  if (salary.paymentMode) {
    y += 20;
    doc.fontSize(10).font("Helvetica-Bold").text("Payment Mode:", labelX, y);
    doc.fontSize(10).font("Helvetica").text(salary.paymentMode.replace(/_/g, " "), valueX, y);
  }

  if (salary.paymentDate) {
    y += 20;
    doc.fontSize(10).font("Helvetica-Bold").text("Payment Date:", labelX, y);
    doc.fontSize(10).font("Helvetica").text(formatDate(salary.paymentDate), valueX, y);
  }

  if (salary.referenceNo) {
    y += 20;
    doc.fontSize(10).font("Helvetica-Bold").text("Reference No:", labelX, y);
    doc.fontSize(10).font("Helvetica").text(salary.referenceNo, valueX, y);
  }

  // ===== FOOTER =====
  const footerTop = 720;
  doc.fontSize(8).font("Helvetica").text(
    "This is a computer-generated salary slip and does not require a signature.",
    50,
    footerTop,
    { align: "center", width: 500 }
  );
  doc.text(
    `Generated on ${formatDate(new Date())}`,
    50,
    footerTop + 15,
    { align: "center", width: 500 }
  );

  // Finalize PDF
  doc.end();

  return bufferPromise;
}

// ========================================
// PDF GENERATION - AMC CONTRACT DOCUMENT
// ========================================

export async function generateAMCContract(contractId: string): Promise<Buffer> {
  const contract = await db.aMCContract.findUnique({
    where: { id: contractId },
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      restaurant: {
        select: {
          name: true,
          address: true,
          city: true,
          pincode: true,
        },
      },
      proposal: {
        select: {
          coveredEquipment: true,
          preventiveVisits: true,
          freeBreakdownVisits: true,
          responseTimeSLA: true,
          resolutionTimeSLA: true,
          exclusions: true,
          sparePartsPolicy: true,
          price: true,
          contractPeriod: true,
        },
      },
    },
  });

  if (!contract) {
    throw new Error("AMC Contract not found");
  }

  // Create PDF document
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const bufferPromise = pdfToBuffer(doc);

  // ===== HEADER =====
  drawColoredHeader(doc, "ANNUAL MAINTENANCE CONTRACT", contract.contractNumber || "—");

  // Calculate duration
  const startDate = new Date(contract.startDate);
  const endDate = new Date(contract.endDate);
  const durationMonths =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
  const durationStr =
    durationMonths >= 12
      ? `${Math.floor(durationMonths / 12)} Year(s) ${durationMonths % 12 > 0 ? `${durationMonths % 12} Month(s)` : ""}`.trim()
      : `${durationMonths} Month(s)`;

  // ===== INFO BOXES =====
  const metaY = 140;
  const customerLines = [
    contract.owner.name,
    contract.restaurant.name,
    contract.restaurant.address,
    `${contract.restaurant.city} - ${contract.restaurant.pincode || "N/A"}`,
    ...(contract.owner.phone ? [`Phone: ${contract.owner.phone}`] : []),
    ...(contract.owner.email ? [`Email: ${contract.owner.email}`] : []),
  ];
  const customerHeight = drawInfoBox(doc, PAGE_LEFT, metaY, 240, "CUSTOMER", customerLines);

  const periodLines = [
    `Status: ${contract.status}`,
    `Start: ${formatDate(contract.startDate)}`,
    `End: ${formatDate(contract.endDate)}`,
    `Duration: ${durationStr}`,
  ];
  const periodHeight = drawInfoBox(doc, 310, metaY, 235, "CONTRACT PERIOD", periodLines);

  let y = metaY + Math.max(customerHeight, periodHeight) + 20;

  // ===== EQUIPMENT COVERED =====
  doc.fillColor(BRAND_DARK).fontSize(11).font("Helvetica-Bold").text("EQUIPMENT COVERED", PAGE_LEFT, y);
  doc.fillColor("#000000");
  y += 18;

  const coveredEquipment = (contract.coveredEquipment ||
    contract.proposal?.coveredEquipment) as Array<{
    name?: string;
    brand?: string;
    model?: string;
    category?: string;
  }> | null;

  if (coveredEquipment && Array.isArray(coveredEquipment) && coveredEquipment.length > 0) {
    const equipCols = [
      { label: "Equipment", x: PAGE_LEFT + 5, width: 140 },
      { label: "Brand", x: 200, width: 105 },
      { label: "Model", x: 310, width: 140 },
      { label: "Category", x: 455, width: 85 },
    ];
    y = drawTableHeader(doc, y, equipCols);
    coveredEquipment.forEach((equip, i) => {
      y = drawTableRow(doc, y, [
        { text: equip.name || "Unknown", x: PAGE_LEFT + 5, width: 140 },
        { text: equip.brand || "-", x: 200, width: 105 },
        { text: equip.model || "-", x: 310, width: 140 },
        { text: equip.category || "-", x: 455, width: 85 },
      ], i % 2 === 0, 36);
    });
    y += 15;
  } else {
    doc.fontSize(10).font("Helvetica").text("As per site survey and proposal.", PAGE_LEFT, y);
    y += 25;
  }

  // ===== SERVICE TERMS =====
  const serviceTermsLines = [
    `Preventive Visits: ${contract.preventiveVisits} per contract period`,
    `Free Breakdown Visits: ${contract.freeBreakdownVisits} (${contract.breakdownVisitsUsed} used)`,
    ...(contract.responseTimeSLA ? [`Response Time SLA: ${contract.responseTimeSLA}`] : []),
    ...(contract.resolutionTimeSLA ? [`Resolution Time SLA: ${contract.resolutionTimeSLA}`] : []),
  ];
  const serviceTermsHeight = drawInfoBox(doc, PAGE_LEFT, y, PAGE_WIDTH, "SERVICE TERMS", serviceTermsLines);
  y += serviceTermsHeight + 20;

  // ===== AMOUNT =====
  y = drawTotalSection(doc, y, [
    { label: "CONTRACT AMOUNT", value: formatCurrency(contract.amount), bold: true },
  ]);
  y += 5;
  doc.fillColor("#6C757D").fontSize(8).font("Helvetica").text("For the full contract period", PAGE_LEFT, y);
  doc.fillColor("#000000");
  y += 15;

  // ===== TERMS & CONDITIONS =====
  y += 15;
  doc.fillColor(BRAND_DARK).fontSize(9).font("Helvetica-Bold").text("TERMS & CONDITIONS", PAGE_LEFT, y);
  y += 14;
  doc.fillColor("#6C757D").fontSize(8).font("Helvetica");
  const termsConditions = [
    "1. This contract is valid for the period mentioned above.",
    "2. Spare parts and consumables may be charged separately unless specified otherwise.",
    "3. Service requests beyond the included visits will be charged at standard rates.",
    "4. The contract is non-transferable without prior written consent.",
    "5. All disputes are subject to Mumbai jurisdiction.",
  ];
  termsConditions.forEach((term) => {
    const termHeight = doc.heightOfString(term, { width: PAGE_WIDTH });
    doc.text(term, PAGE_LEFT, y, { width: PAGE_WIDTH });
    y += Math.max(11, termHeight) + 2;
  });
  doc.fillColor("#000000");

  // ===== FOOTER =====
  drawFooter(doc, [
    "1. This is a computer-generated document and does not require a signature.",
    "2. Contact the KNI Services team for any queries regarding this contract.",
  ], "document");

  // Finalize PDF
  doc.end();

  return bufferPromise;
}
