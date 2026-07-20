import PDFDocument from "pdfkit";
import {
  pdfToBuffer,
  drawColoredHeader,
  drawFooter,
  BRAND_RED,
  BRAND_DARK,
  PAGE_LEFT,
  PAGE_WIDTH,
} from "./invoice-service";

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface AnalyticsReportInput {
  restaurantName: string;
  period: string;
  generatedAt: string;
  summary: {
    bookings: { count: number; revenue: number };
    expenses: { count: number; total: number };
    equipment: { count: number };
    netRevenue: number;
  };
  breakdowns: {
    bookingsByStatus: { status: string; count: number }[];
    expensesByCategory: { category: string; count: number; total: number }[];
  };
  recent: {
    bookings: { id: string; status: string; totalAmount: number; createdAt: string }[];
    expenses: { id: string; amount: number; category: string; date: string; description: string }[];
  };
}

function drawSectionTitle(doc: PDFKit.PDFDocument, y: number, title: string): number {
  doc.fillColor(BRAND_DARK).fontSize(12).font("Helvetica-Bold").text(title, PAGE_LEFT, y);
  doc.fillColor("#000000");
  return y + 20;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  y: number,
  cols: Array<{ label: string; width: number; align?: "left" | "right" | "center" }>,
  rows: string[][]
): number {
  let currentY = y;
  let x = PAGE_LEFT;

  doc.rect(PAGE_LEFT, currentY, PAGE_WIDTH, 20).fill(BRAND_DARK);
  doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica-Bold");
  x = PAGE_LEFT;
  cols.forEach((col) => {
    doc.text(col.label, x + 6, currentY + 5, { width: col.width - 12, align: col.align || "left" });
    x += col.width;
  });
  doc.fillColor("#000000");
  currentY += 20;

  rows.forEach((row, i) => {
    if (i % 2 === 0) doc.rect(PAGE_LEFT, currentY, PAGE_WIDTH, 18).fill("#F8F9FA");
    doc.fillColor("#333333").fontSize(9).font("Helvetica");
    x = PAGE_LEFT;
    row.forEach((cell, colIdx) => {
      doc.text(cell, x + 6, currentY + 4, { width: cols[colIdx].width - 12, align: cols[colIdx].align || "left", ellipsis: true });
      x += cols[colIdx].width;
    });
    doc.fillColor("#000000");
    currentY += 18;
  });

  return currentY + 10;
}

export async function generateAnalyticsReport(data: AnalyticsReportInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const bufferPromise = pdfToBuffer(doc);

  drawColoredHeader(doc, "ANALYTICS REPORT", data.period);

  let y = 145;
  doc.fillColor("#333333").fontSize(10).font("Helvetica").text(data.restaurantName, PAGE_LEFT, y);
  y += 15;
  doc.fillColor("#6C757D").fontSize(8).text(
    `Generated: ${new Date(data.generatedAt).toLocaleString("en-IN")}`,
    PAGE_LEFT,
    y
  );
  y += 25;

  // Summary cards
  const cardW = PAGE_WIDTH / 4 - 6;
  const cards = [
    { label: "Bookings", value: String(data.summary.bookings.count) },
    { label: "Booking Revenue", value: formatCurrency(data.summary.bookings.revenue) },
    { label: "Expenses", value: formatCurrency(data.summary.expenses.total) },
    { label: "Net Revenue", value: formatCurrency(data.summary.netRevenue) },
  ];
  cards.forEach((card, i) => {
    const x = PAGE_LEFT + i * (cardW + 8);
    doc.rect(x, y, cardW, 50).fill("#F8F9FA").stroke("#DEE2E6");
    doc.fillColor("#6C757D").fontSize(8).font("Helvetica").text(card.label, x + 8, y + 8, { width: cardW - 16 });
    doc.fillColor(BRAND_RED).fontSize(11).font("Helvetica-Bold").text(card.value, x + 8, y + 24, { width: cardW - 16 });
    doc.fillColor("#000000");
  });
  y += 70;

  y = drawSectionTitle(doc, y, "Bookings by Status");
  y = drawTable(
    doc,
    y,
    [
      { label: "Status", width: PAGE_WIDTH * 0.7 },
      { label: "Count", width: PAGE_WIDTH * 0.3, align: "right" },
    ],
    data.breakdowns.bookingsByStatus.map((b) => [b.status.replace(/_/g, " "), String(b.count)])
  );

  y = drawSectionTitle(doc, y, "Expenses by Category");
  y = drawTable(
    doc,
    y,
    [
      { label: "Category", width: PAGE_WIDTH * 0.5 },
      { label: "Count", width: PAGE_WIDTH * 0.2, align: "right" },
      { label: "Total", width: PAGE_WIDTH * 0.3, align: "right" },
    ],
    data.breakdowns.expensesByCategory.map((e) => [e.category.replace(/_/g, " "), String(e.count), formatCurrency(e.total)])
  );

  if (y > 620) {
    doc.addPage();
    y = 50;
  }

  y = drawSectionTitle(doc, y, "Recent Bookings");
  y = drawTable(
    doc,
    y,
    [
      { label: "Date", width: PAGE_WIDTH * 0.3 },
      { label: "Status", width: PAGE_WIDTH * 0.4 },
      { label: "Amount", width: PAGE_WIDTH * 0.3, align: "right" },
    ],
    data.recent.bookings.map((b) => [
      new Date(b.createdAt).toLocaleDateString("en-IN"),
      b.status.replace(/_/g, " "),
      formatCurrency(b.totalAmount),
    ])
  );

  drawFooter(doc, [
    "This report is generated from live account data and may not reflect real-time changes.",
    `Restaurant: ${data.restaurantName}`,
  ]);

  doc.end();
  return bufferPromise;
}
