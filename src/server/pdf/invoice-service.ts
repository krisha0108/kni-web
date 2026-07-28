import PDFDocument from "pdfkit";
import { db } from "@/server/db";

// Company/Business Information
export const COMPANY_INFO = {
  name: process.env.COMPANY_NAME || "KNI Super App",
  address: process.env.COMPANY_ADDRESS || "Mumbai, Maharashtra, India",
  phone: process.env.COMPANY_PHONE || "+91 1234567890",
  email: process.env.COMPANY_EMAIL || "info@knisuperapp.com",
  gst: process.env.COMPANY_GST || "27AAAAA0000A1Z5",
  website: process.env.COMPANY_WEBSITE || "www.knisuperapp.com",
};

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
 * Generate invoice number from booking/order ID
 */
function generateInvoiceNumber(type: "BOOKING" | "ORDER", id: string, date: Date): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const prefix = type === "BOOKING" ? "INV-B" : "INV-O";
  const shortId = id.slice(-6).toUpperCase();
  return `${prefix}-${year}${month}-${shortId}`;
}

/**
 * Convert PDFDocument to buffer by collecting chunks
 */
export function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

// ========================================
// SHARED PDF HELPERS
// ========================================

export const BRAND_RED = "#EF3A3A";
export const BRAND_DARK = "#1D2254";
const GRAY_BG = "#F8F9FA";
const GRAY_BORDER = "#DEE2E6";
const GRAY_TEXT = "#6C757D";
export const PAGE_LEFT = 50;
export const PAGE_RIGHT = 545;
export const PAGE_WIDTH = PAGE_RIGHT - PAGE_LEFT;

export function drawColoredHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  // Red banner
  doc.rect(0, 0, 595, 90).fill(BRAND_RED);
  doc.fontSize(22).font("Helvetica-Bold").fillColor("#FFFFFF").text(COMPANY_INFO.name, PAGE_LEFT, 20);
  doc.fontSize(9).font("Helvetica").text(
    `${COMPANY_INFO.address}  |  ${COMPANY_INFO.phone}  |  ${COMPANY_INFO.email}`,
    PAGE_LEFT, 48
  );
  doc.text(`GST: ${COMPANY_INFO.gst}  |  ${COMPANY_INFO.website}`, PAGE_LEFT, 62);

  // Title bar
  doc.rect(0, 90, 595, 36).fill(BRAND_DARK);
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#FFFFFF").text(title, PAGE_LEFT, 99);
  doc.fontSize(9).font("Helvetica").text(subtitle, PAGE_LEFT, 99, { width: PAGE_WIDTH, align: "right" });

  // Reset fill color
  doc.fillColor("#000000");
}

export function drawInfoBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, label: string, lines: string[]): number {
  const textWidth = w - 20;
  doc.fontSize(9).font("Helvetica");
  const lineHeights = lines.map((line) => Math.max(15, doc.heightOfString(line, { width: textWidth })));
  const boxHeight = 20 + lineHeights.reduce((sum, h) => sum + h, 0);

  doc.rect(x, y, w, boxHeight).fill(GRAY_BG).stroke(GRAY_BORDER);
  doc.fillColor(BRAND_DARK).fontSize(9).font("Helvetica-Bold").text(label, x + 10, y + 5);
  doc.fillColor("#333333").font("Helvetica").fontSize(9);
  let lineY = y + 20;
  lines.forEach((line, i) => {
    doc.text(line, x + 10, lineY, { width: textWidth });
    lineY += lineHeights[i];
  });
  doc.fillColor("#000000");
  return boxHeight;
}

export function drawTableHeader(doc: PDFKit.PDFDocument, y: number, cols: Array<{ label: string; x: number; width: number; align?: string }>) {
  doc.rect(PAGE_LEFT, y, PAGE_WIDTH, 22).fill(BRAND_DARK);
  doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica-Bold");
  cols.forEach((col) => {
    doc.text(col.label, col.x, y + 6, { width: col.width, align: (col.align as any) || "left" });
  });
  doc.fillColor("#000000");
  return y + 22;
}

export function drawTableRow(doc: PDFKit.PDFDocument, y: number, cols: Array<{ text: string; x: number; width: number; align?: string }>, isEven: boolean, rowHeight: number = 22) {
  if (isEven) {
    doc.rect(PAGE_LEFT, y, PAGE_WIDTH, rowHeight).fill(GRAY_BG);
  }
  doc.fillColor("#333333").fontSize(9).font("Helvetica");
  cols.forEach((col) => {
    // `ellipsis` only truncates when a `height` is also given — without it,
    // pdfkit just wraps normally and long cell text overflows into the next row.
    doc.text(col.text, col.x, y + 6, { width: col.width, height: rowHeight - 8, align: (col.align as any) || "left", ellipsis: true });
  });
  doc.fillColor("#000000");
  return y + rowHeight;
}

export function drawTotalSection(doc: PDFKit.PDFDocument, y: number, rows: Array<{ label: string; value: string; bold?: boolean }>) {
  const boxX = 350;
  const boxW = PAGE_RIGHT - boxX;
  let currentY = y;

  rows.forEach((row, i) => {
    if (row.bold) {
      doc.rect(boxX, currentY, boxW, 22).fill(BRAND_RED);
      doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold");
      doc.text(row.label, boxX + 10, currentY + 6);
      doc.text(row.value, boxX + 10, currentY + 6, { width: boxW - 20, align: "right" });
      doc.fillColor("#000000");
    } else {
      doc.rect(boxX, currentY, boxW, 20).fill(GRAY_BG).stroke(GRAY_BORDER);
      doc.fillColor(GRAY_TEXT).fontSize(9).font("Helvetica");
      doc.text(row.label, boxX + 10, currentY + 5);
      doc.fillColor("#333333").text(row.value, boxX + 10, currentY + 5, { width: boxW - 20, align: "right" });
      doc.fillColor("#000000");
    }
    currentY += row.bold ? 22 : 20;
  });
  return currentY;
}

export function drawFooter(doc: PDFKit.PDFDocument, terms: string[], docTypeLabel: string = "invoice") {
  // Kept comfortably inside the A4 content area (bottom margin ~792pt) —
  // pushing this any lower causes the last line to spill onto a wasted page 2.
  const y = 695;
  doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_RIGHT, y).lineWidth(0.5).strokeColor(GRAY_BORDER).stroke();
  doc.strokeColor("#000000").lineWidth(1);

  doc.fillColor(GRAY_TEXT).fontSize(7).font("Helvetica");
  terms.forEach((term, i) => {
    doc.text(term, PAGE_LEFT, y + 10 + i * 11);
  });

  doc.fillColor(BRAND_DARK).fontSize(8).font("Helvetica-Bold").text(
    "Thank you for your business!",
    PAGE_LEFT, y + 10 + terms.length * 11 + 8,
    { width: PAGE_WIDTH, align: "center" }
  );
  doc.fillColor(GRAY_TEXT).fontSize(7).font("Helvetica").text(
    `Generated on ${formatDate(new Date())}  |  This is a computer-generated ${docTypeLabel}.`,
    PAGE_LEFT, y + 10 + terms.length * 11 + 22,
    { width: PAGE_WIDTH, align: "center" }
  );
  doc.fillColor("#000000");
}

// ========================================
// PDF GENERATION - SERVICE BOOKING INVOICE
// ========================================

export async function generateBookingInvoice(bookingId: string): Promise<Buffer> {
  const booking = await db.serviceBooking.findUnique({
    where: { id: bookingId },
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      restaurant: {
        select: { name: true, address: true, city: true, pincode: true, fssaiNumber: true },
      },
      items: {
        include: {
          serviceItem: { select: { name: true, description: true } },
          partItem: { select: { name: true, description: true } },
        },
      },
      paymentProof: { select: { verifiedAt: true } },
      engineerAssignments: {
        where: { status: "COMPLETED" },
        include: { engineer: { select: { name: true, phone: true } } },
        take: 1,
      },
    },
  });

  if (!booking) throw new Error("Booking not found");

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const bufferPromise = pdfToBuffer(doc);
  const invoiceNumber = generateInvoiceNumber("BOOKING", booking.id, booking.createdAt);

  // ===== HEADER =====
  drawColoredHeader(doc, "SERVICE INVOICE", invoiceNumber);

  // ===== INVOICE META =====
  const metaY = 140;
  const billToLines = [
    booking.owner.name,
    booking.restaurant.name,
    booking.restaurant.address,
    `${booking.restaurant.city} - ${booking.restaurant.pincode || "N/A"}`,
    ...(booking.owner.phone ? [`Phone: ${booking.owner.phone}`] : []),
    ...(booking.owner.email ? [`Email: ${booking.owner.email}`] : []),
    ...(booking.restaurant.fssaiNumber ? [`FSSAI: ${booking.restaurant.fssaiNumber}`] : []),
  ];
  const billToHeight = drawInfoBox(doc, PAGE_LEFT, metaY, 240, "BILL TO", billToLines);

  const invoiceLines = [
    `Invoice #: ${invoiceNumber}`,
    `Date: ${formatDate(booking.createdAt)}`,
    ...(booking.paymentProof?.verifiedAt ? [`Paid: ${formatDate(booking.paymentProof.verifiedAt)}`] : []),
    ...(booking.slotStartDateTime ? [`Scheduled: ${formatDate(booking.slotStartDateTime)}`] : []),
    ...(booking.engineerAssignments.length > 0
      ? [`Engineer: ${booking.engineerAssignments[0].engineer.name}`]
      : []),
  ];
  const invoiceDetailsHeight = drawInfoBox(doc, 310, metaY, 235, "INVOICE DETAILS", invoiceLines);

  // ===== ITEMS TABLE =====
  const tableCols = [
    { label: "#", x: 55, width: 25, align: "center" },
    { label: "Item", x: 85, width: 195 },
    { label: "Type", x: 285, width: 70 },
    { label: "Qty", x: 360, width: 40, align: "center" },
    { label: "Price", x: 405, width: 65, align: "right" },
    { label: "Amount", x: 475, width: 65, align: "right" },
  ];
  let tableY = metaY + Math.max(billToHeight, invoiceDetailsHeight) + 20;
  tableY = drawTableHeader(doc, tableY, tableCols);

  booking.items.forEach((item, i) => {
    const itemName = item.serviceItem?.name || item.partItem?.name || "N/A";
    const itemType = item.itemType === "SERVICE" ? "Service" : "Part";
    tableY = drawTableRow(doc, tableY, [
      { text: String(i + 1), x: 55, width: 25, align: "center" },
      { text: itemName, x: 85, width: 195 },
      { text: itemType, x: 285, width: 70 },
      { text: String(item.qty), x: 360, width: 40, align: "center" },
      { text: formatCurrency(item.priceSnapshot), x: 405, width: 65, align: "right" },
      { text: formatCurrency(item.qty * item.priceSnapshot), x: 475, width: 65, align: "right" },
    ], i % 2 === 0);
  });

  // Bottom border of table
  doc.moveTo(PAGE_LEFT, tableY).lineTo(PAGE_RIGHT, tableY).lineWidth(0.5).strokeColor(GRAY_BORDER).stroke();
  doc.strokeColor("#000000").lineWidth(1);

  // ===== TOTALS =====
  const gstRate = 18;
  const baseAmount = Math.floor((booking.totalAmount * 100) / (100 + gstRate));
  const gstAmount = booking.totalAmount - baseAmount;

  drawTotalSection(doc, tableY + 15, [
    { label: "Subtotal", value: formatCurrency(baseAmount) },
    { label: `GST (${gstRate}%)`, value: formatCurrency(gstAmount) },
    { label: "TOTAL", value: formatCurrency(booking.totalAmount), bold: true },
  ]);

  // ===== FOOTER =====
  drawFooter(doc, [
    "1. Payment is due upon service completion.",
    "2. All disputes subject to Mumbai jurisdiction.",
    "3. Warranty as per service agreement terms.",
  ]);

  doc.end();
  return bufferPromise;
}

// ========================================
// PDF GENERATION - MARKETPLACE ORDER INVOICE
// ========================================

export async function generateOrderInvoice(orderId: string): Promise<Buffer> {
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      vendor: { select: { name: true, email: true, phone: true } },
      restaurant: {
        select: { name: true, address: true, city: true, pincode: true, fssaiNumber: true },
      },
      items: {
        include: {
          product: {
            select: {
              name: true, description: true, unit: true,
              product: { select: { name: true, unit: true } },
            },
          },
        },
      },
    },
  });

  if (!order) throw new Error("Order not found");

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const bufferPromise = pdfToBuffer(doc);
  const invoiceNumber = generateInvoiceNumber("ORDER", order.id, order.createdAt);

  // ===== HEADER =====
  drawColoredHeader(doc, "MARKETPLACE INVOICE", invoiceNumber);

  // ===== INFO BOXES =====
  const metaY = 140;
  const shipToLines = [
    order.owner.name,
    order.restaurant.name,
    order.restaurant.address,
    `${order.restaurant.city} - ${order.restaurant.pincode || "N/A"}`,
    ...(order.owner.phone ? [`Phone: ${order.owner.phone}`] : []),
  ];
  const shipToHeight = drawInfoBox(doc, PAGE_LEFT, metaY, 240, "SHIP TO", shipToLines);

  const invoiceLines = [
    `Invoice #: ${invoiceNumber}`,
    `Order Date: ${formatDate(order.createdAt)}`,
    `Status: ${order.status}`,
    `Vendor: ${order.vendor.name}`,
    ...(order.actualDeliveryDate ? [`Delivered: ${formatDate(order.actualDeliveryDate)}`] : []),
    ...(order.expectedDeliveryDate && !order.actualDeliveryDate ? [`Expected: ${formatDate(order.expectedDeliveryDate)}`] : []),
  ];
  const orderDetailsHeight = drawInfoBox(doc, 310, metaY, 235, "ORDER DETAILS", invoiceLines);

  // ===== ITEMS TABLE =====
  const tableCols = [
    { label: "#", x: 55, width: 25, align: "center" },
    { label: "Product", x: 85, width: 175 },
    { label: "Unit", x: 265, width: 55 },
    { label: "Qty", x: 325, width: 40, align: "center" },
    { label: "Price", x: 370, width: 75, align: "right" },
    { label: "Amount", x: 450, width: 90, align: "right" },
  ];
  let tableY = metaY + Math.max(shipToHeight, orderDetailsHeight) + 20;
  tableY = drawTableHeader(doc, tableY, tableCols);

  order.items.forEach((item, i) => {
    const productName = item.product.product?.name || item.product.name || "Unknown Product";
    const unit = item.product.product?.unit || item.product.unit || "unit";
    tableY = drawTableRow(doc, tableY, [
      { text: String(i + 1), x: 55, width: 25, align: "center" },
      { text: productName, x: 85, width: 175 },
      { text: unit, x: 265, width: 55 },
      { text: String(item.qty), x: 325, width: 40, align: "center" },
      { text: formatCurrency(item.priceSnapshot), x: 370, width: 75, align: "right" },
      { text: formatCurrency(item.qty * item.priceSnapshot), x: 450, width: 90, align: "right" },
    ], i % 2 === 0);
  });

  doc.moveTo(PAGE_LEFT, tableY).lineTo(PAGE_RIGHT, tableY).lineWidth(0.5).strokeColor(GRAY_BORDER).stroke();
  doc.strokeColor("#000000").lineWidth(1);

  // ===== TOTALS =====
  drawTotalSection(doc, tableY + 15, [
    { label: "Subtotal", value: formatCurrency(order.totalAmount) },
    { label: "TOTAL", value: formatCurrency(order.totalAmount), bold: true },
  ]);

  // ===== VENDOR NOTE =====
  if (order.statusNotes) {
    doc.fillColor(GRAY_TEXT).fontSize(8).font("Helvetica").text(
      `Vendor Note: ${order.statusNotes}`, PAGE_LEFT, tableY + 70, { width: 280 }
    );
    doc.fillColor("#000000");
  }

  // ===== FOOTER =====
  drawFooter(doc, [
    "1. Products are subject to vendor return/exchange policy.",
    "2. All disputes subject to Mumbai jurisdiction.",
    "3. Prices are inclusive of applicable taxes.",
  ]);

  doc.end();
  return bufferPromise;
}

// ========================================
// INVOICE PREVIEW (HTML-like structure for debugging)
// ========================================

export async function generateBookingInvoicePreview(bookingId: string): Promise<string> {
  const booking = await db.serviceBooking.findUnique({
    where: { id: bookingId },
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      restaurant: { select: { name: true, address: true, city: true } },
      items: {
        include: {
          serviceItem: { select: { name: true } },
          partItem: { select: { name: true } },
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const invoiceNumber = generateInvoiceNumber("BOOKING", booking.id, booking.createdAt);

  return `
    Invoice: ${invoiceNumber}
    Date: ${formatDate(booking.createdAt)}
    Customer: ${booking.owner.name}
    Restaurant: ${booking.restaurant.name}

    Items:
    ${booking.items.map((item) => {
      const name = item.serviceItem?.name || item.partItem?.name;
      return `- ${name} x${item.qty} @ ${formatCurrency(item.priceSnapshot)}`;
    }).join("\n    ")}

    Total: ${formatCurrency(booking.totalAmount)}
  `;
}
