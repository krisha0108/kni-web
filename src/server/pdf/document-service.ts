import PDFDocument from "pdfkit";
import { db } from "@/server/db";
import { Readable } from "stream";

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
 * Convert stream to buffer
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
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
  const stream = new Readable({
    read() {},
  });
  doc.pipe(stream as any);

  // Receipt Number
  const dateStr = new Date(expense.expenseDate).toISOString().slice(0, 10).replace(/-/g, "");
  const shortId = expense.id.slice(-6).toUpperCase();
  const receiptNumber = `RCP-${dateStr}-${shortId}`;

  // ===== HEADER =====
  doc.fontSize(20).font("Helvetica-Bold").text(expense.restaurant.name, 50, 50);
  doc.fontSize(10).font("Helvetica").text(expense.restaurant.address);
  doc.text(`${expense.restaurant.city} - ${expense.restaurant.pincode || "N/A"}`);

  // Horizontal line
  doc.moveTo(50, 120).lineTo(550, 120).stroke();

  // ===== RECEIPT TITLE =====
  doc.fontSize(24).font("Helvetica-Bold").text("EXPENSE RECEIPT", 50, 140);
  doc.fontSize(10).font("Helvetica").text(`Receipt #: ${receiptNumber}`, 400, 145);
  doc.text(`Date: ${formatDate(expense.expenseDate)}`, 400, 160);

  // ===== RECEIPT DETAILS =====
  const detailsTop = 200;
  doc.fontSize(12).font("Helvetica-Bold").text("RECEIPT DETAILS:", 50, detailsTop);

  doc.moveTo(50, detailsTop + 18).lineTo(550, detailsTop + 18).stroke();

  let y = detailsTop + 30;
  const labelX = 50;
  const valueX = 200;

  doc.fontSize(11).font("Helvetica-Bold").text("Date:", labelX, y);
  doc.fontSize(11).font("Helvetica").text(formatDate(expense.expenseDate), valueX, y);

  y += 25;
  doc.fontSize(11).font("Helvetica-Bold").text("Category:", labelX, y);
  doc.fontSize(11).font("Helvetica").text(expense.category.replace(/_/g, " "), valueX, y);

  y += 25;
  doc.fontSize(11).font("Helvetica-Bold").text("Amount:", labelX, y);
  doc.fontSize(14).font("Helvetica-Bold").text(formatCurrency(expense.amount), valueX, y);

  y += 30;
  doc.fontSize(11).font("Helvetica-Bold").text("Description:", labelX, y);
  doc.fontSize(11).font("Helvetica").text(expense.description, valueX, y, {
    width: 340,
  });

  y += 50;
  doc.fontSize(11).font("Helvetica-Bold").text("Recorded By:", labelX, y);
  doc.fontSize(11).font("Helvetica").text(expense.owner.name, valueX, y);

  y += 25;
  doc.fontSize(11).font("Helvetica-Bold").text("Created At:", labelX, y);
  doc.fontSize(11).font("Helvetica").text(formatDate(expense.createdAt), valueX, y);

  // Line
  y += 30;
  doc.moveTo(50, y).lineTo(550, y).stroke();

  // ===== TOTAL BOX =====
  y += 15;
  doc.fontSize(14).font("Helvetica-Bold").text("TOTAL AMOUNT", 50, y);
  doc.text(formatCurrency(expense.amount), 400, y, { width: 150, align: "right" });

  // ===== FOOTER =====
  const footerTop = 700;
  doc.fontSize(8).font("Helvetica").text(
    "This is a computer-generated receipt and does not require a signature.",
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

  return streamToBuffer(stream);
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
  const stream = new Readable({
    read() {},
  });
  doc.pipe(stream as any);

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

  return streamToBuffer(stream);
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
          monthlyPrice: true,
          quarterlyPrice: true,
          annualPrice: true,
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
  const stream = new Readable({
    read() {},
  });
  doc.pipe(stream as any);

  // ===== HEADER =====
  doc.fontSize(22).font("Helvetica-Bold").text("ANNUAL MAINTENANCE CONTRACT", 50, 50, {
    align: "center",
    width: 500,
  });

  // Horizontal line
  doc.moveTo(50, 85).lineTo(550, 85).stroke();

  // ===== CONTRACT INFO =====
  doc.fontSize(10).font("Helvetica").text(
    `Contract #: ${contract.contractNumber}`,
    400,
    95
  );
  doc.text(`Status: ${contract.status}`, 400, 110);

  // ===== CUSTOMER DETAILS =====
  const custTop = 95;
  doc.fontSize(12).font("Helvetica-Bold").text("CUSTOMER:", 50, custTop);

  let y = custTop + 20;
  doc.fontSize(10).font("Helvetica").text(contract.owner.name, 50, y);
  y += 15;
  doc.text(contract.restaurant.name, 50, y);
  y += 15;
  doc.text(contract.restaurant.address, 50, y);
  y += 15;
  doc.text(`${contract.restaurant.city} - ${contract.restaurant.pincode || "N/A"}`, 50, y);
  if (contract.owner.phone) {
    y += 15;
    doc.text(`Phone: ${contract.owner.phone}`, 50, y);
  }
  if (contract.owner.email) {
    y += 15;
    doc.text(`Email: ${contract.owner.email}`, 50, y);
  }

  // ===== CONTRACT DATES =====
  y += 30;
  doc.fontSize(12).font("Helvetica-Bold").text("CONTRACT PERIOD:", 50, y);
  y += 18;
  doc.moveTo(50, y).lineTo(550, y).stroke();

  const labelX = 50;
  const valueX = 200;

  y += 10;
  doc.fontSize(10).font("Helvetica-Bold").text("Start Date:", labelX, y);
  doc.fontSize(10).font("Helvetica").text(formatDate(contract.startDate), valueX, y);

  y += 20;
  doc.fontSize(10).font("Helvetica-Bold").text("End Date:", labelX, y);
  doc.fontSize(10).font("Helvetica").text(formatDate(contract.endDate), valueX, y);

  // Calculate duration
  const startDate = new Date(contract.startDate);
  const endDate = new Date(contract.endDate);
  const durationMonths =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
  const durationStr =
    durationMonths >= 12
      ? `${Math.floor(durationMonths / 12)} Year(s) ${durationMonths % 12 > 0 ? `${durationMonths % 12} Month(s)` : ""}`
      : `${durationMonths} Month(s)`;

  y += 20;
  doc.fontSize(10).font("Helvetica-Bold").text("Duration:", labelX, y);
  doc.fontSize(10).font("Helvetica").text(durationStr.trim(), valueX, y);

  y += 20;
  doc.fontSize(10).font("Helvetica-Bold").text("Billing Cycle:", labelX, y);
  doc.fontSize(10).font("Helvetica").text(contract.billingCycle, valueX, y);

  // ===== EQUIPMENT COVERED =====
  y += 35;
  doc.fontSize(12).font("Helvetica-Bold").text("EQUIPMENT COVERED:", 50, y);
  y += 18;
  doc.moveTo(50, y).lineTo(550, y).stroke();

  y += 10;
  const coveredEquipment = (contract.coveredEquipment ||
    contract.proposal?.coveredEquipment) as Array<{
    name?: string;
    brand?: string;
    model?: string;
    category?: string;
  }> | null;

  if (coveredEquipment && Array.isArray(coveredEquipment) && coveredEquipment.length > 0) {
    coveredEquipment.forEach((equip) => {
      const name = equip.name || "Unknown";
      const details = [equip.brand, equip.model, equip.category].filter(Boolean).join(" | ");
      doc.fontSize(10).font("Helvetica").text(`• ${name}${details ? ` (${details})` : ""}`, 60, y, {
        width: 480,
      });
      y += 18;
    });
  } else {
    doc.fontSize(10).font("Helvetica").text("As per site survey and proposal.", 60, y);
    y += 18;
  }

  // ===== SERVICE DETAILS =====
  y += 15;
  doc.fontSize(12).font("Helvetica-Bold").text("SERVICE TERMS:", 50, y);
  y += 18;
  doc.moveTo(50, y).lineTo(550, y).stroke();

  y += 10;
  doc.fontSize(10).font("Helvetica-Bold").text("Preventive Visits:", labelX, y);
  doc.fontSize(10).font("Helvetica").text(
    `${contract.preventiveVisits} per contract period`,
    valueX,
    y
  );

  y += 20;
  doc.fontSize(10).font("Helvetica-Bold").text("Free Breakdown Visits:", labelX, y);
  doc.fontSize(10).font("Helvetica").text(
    `${contract.freeBreakdownVisits} (${contract.breakdownVisitsUsed} used)`,
    valueX,
    y
  );

  if (contract.responseTimeSLA) {
    y += 20;
    doc.fontSize(10).font("Helvetica-Bold").text("Response Time SLA:", labelX, y);
    doc.fontSize(10).font("Helvetica").text(contract.responseTimeSLA, valueX, y);
  }

  if (contract.resolutionTimeSLA) {
    y += 20;
    doc.fontSize(10).font("Helvetica-Bold").text("Resolution Time SLA:", labelX, y);
    doc.fontSize(10).font("Helvetica").text(contract.resolutionTimeSLA, valueX, y);
  }

  // ===== AMOUNT =====
  y += 35;
  doc.moveTo(50, y).lineTo(550, y).stroke();

  y += 15;
  doc.fontSize(14).font("Helvetica-Bold").text("CONTRACT AMOUNT:", 50, y);
  doc.text(
    formatCurrency(contract.amountPerCycle),
    400,
    y,
    { width: 150, align: "right" }
  );

  y += 20;
  doc.fontSize(10).font("Helvetica").text(`Per ${contract.billingCycle.toLowerCase()} cycle`, 50, y);

  if (contract.proposal) {
    y += 20;
    if (contract.proposal.monthlyPrice) {
      doc.text(`Monthly: ${formatCurrency(contract.proposal.monthlyPrice)}`, 50, y);
    }
    if (contract.proposal.quarterlyPrice) {
      doc.text(
        `Quarterly: ${formatCurrency(contract.proposal.quarterlyPrice)}`,
        220,
        y
      );
    }
    if (contract.proposal.annualPrice) {
      doc.text(
        `Annual: ${formatCurrency(contract.proposal.annualPrice)}`,
        400,
        y
      );
    }
  }

  // ===== TERMS =====
  y += 35;
  doc.fontSize(10).font("Helvetica-Bold").text("TERMS & CONDITIONS:", 50, y);
  y += 15;
  doc.fontSize(8).font("Helvetica");
  doc.text(
    "1. This contract is valid for the period mentioned above.",
    60,
    y,
    { width: 480 }
  );
  y += 12;
  doc.text(
    "2. Spare parts and consumables may be charged separately unless specified otherwise.",
    60,
    y,
    { width: 480 }
  );
  y += 12;
  doc.text(
    "3. Service requests beyond the included visits will be charged at standard rates.",
    60,
    y,
    { width: 480 }
  );
  y += 12;
  doc.text(
    "4. The contract is non-transferable without prior written consent.",
    60,
    y,
    { width: 480 }
  );
  y += 12;
  doc.text("5. All disputes are subject to Mumbai jurisdiction.", 60, y, {
    width: 480,
  });

  // ===== FOOTER =====
  const footerTop = 750;
  doc.fontSize(8).font("Helvetica").text(
    "This is a computer-generated document.",
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

  return streamToBuffer(stream);
}
