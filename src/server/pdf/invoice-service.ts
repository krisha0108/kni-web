import PDFDocument from "pdfkit";
import { db } from "@/server/db";
import { Readable } from "stream";

// Company/Business Information
const COMPANY_INFO = {
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
function formatCurrency(amountInPaise: number): string {
  return `₹${(amountInPaise / 100).toLocaleString("en-IN", {
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
// PDF GENERATION - SERVICE BOOKING INVOICE
// ========================================

export async function generateBookingInvoice(bookingId: string): Promise<Buffer> {
  // Fetch booking details
  const booking = await db.serviceBooking.findUnique({
    where: { id: bookingId },
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      restaurant: {
        select: {
          name: true,
          address: true,
          city: true,
          pincode: true,
          fssaiNumber: true,
        },
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
        include: {
          engineer: { select: { name: true, phone: true } },
        },
        take: 1,
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  // Create PDF document
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = new Readable({
    read() {},
  });
  doc.pipe(stream as any);

  // Invoice Number
  const invoiceNumber = generateInvoiceNumber("BOOKING", booking.id, booking.createdAt);

  // ===== HEADER =====
  doc.fontSize(20).font("Helvetica-Bold").text(COMPANY_INFO.name, 50, 50);
  doc.fontSize(10).font("Helvetica").text(COMPANY_INFO.address);
  doc.text(`Phone: ${COMPANY_INFO.phone}`);
  doc.text(`Email: ${COMPANY_INFO.email}`);
  doc.text(`GST: ${COMPANY_INFO.gst}`);
  doc.text(`Website: ${COMPANY_INFO.website}`);

  // Horizontal line
  doc.moveTo(50, 150).lineTo(550, 150).stroke();

  // ===== INVOICE TITLE =====
  doc.fontSize(24).font("Helvetica-Bold").text("SERVICE INVOICE", 50, 170);
  doc.fontSize(10).font("Helvetica").text(`Invoice #: ${invoiceNumber}`, 400, 175);
  doc.text(`Date: ${formatDate(booking.createdAt)}`, 400, 190);
  if (booking.paymentProof?.verifiedAt) {
    doc.text(`Payment Date: ${formatDate(booking.paymentProof.verifiedAt)}`, 400, 205);
  }

  // ===== CUSTOMER DETAILS =====
  doc.fontSize(12).font("Helvetica-Bold").text("BILL TO:", 50, 230);
  doc.fontSize(10).font("Helvetica").text(booking.owner.name, 50, 250);
  doc.text(booking.restaurant.name, 50, 265);
  doc.text(booking.restaurant.address, 50, 280);
  doc.text(`${booking.restaurant.city} - ${booking.restaurant.pincode || "N/A"}`, 50, 295);
  if (booking.owner.phone) {
    doc.text(`Phone: ${booking.owner.phone}`, 50, 310);
  }
  if (booking.owner.email) {
    doc.text(`Email: ${booking.owner.email}`, 50, 325);
  }
  if (booking.restaurant.fssaiNumber) {
    doc.text(`FSSAI: ${booking.restaurant.fssaiNumber}`, 50, 340);
  }

  // ===== SERVICE DETAILS =====
  if (booking.slotStartDateTime) {
    doc.fontSize(12).font("Helvetica-Bold").text("SERVICE DETAILS:", 350, 230);
    doc.fontSize(10).font("Helvetica").text(
      `Scheduled: ${formatDate(booking.slotStartDateTime)}`,
      350,
      250
    );
    const slotTime = new Date(booking.slotStartDateTime).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.text(`Time: ${slotTime}`, 350, 265);
  }

  if (booking.engineerAssignments.length > 0) {
    const engineer = booking.engineerAssignments[0];
    doc.text(`Engineer: ${engineer.engineer.name}`, 350, 280);
    if (engineer.engineer.phone) {
      doc.text(`Contact: ${engineer.engineer.phone}`, 350, 295);
    }
  }

  // ===== ITEMS TABLE =====
  const tableTop = 380;
  doc.fontSize(11).font("Helvetica-Bold");

  // Table headers
  doc.text("Item", 50, tableTop);
  doc.text("Type", 280, tableTop);
  doc.text("Qty", 370, tableTop, { width: 50, align: "center" });
  doc.text("Price", 440, tableTop, { width: 60, align: "right" });
  doc.text("Amount", 510, tableTop, { width: 70, align: "right" });

  // Line under headers
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  // Table rows
  let position = tableTop + 25;
  doc.font("Helvetica").fontSize(10);

  booking.items.forEach((item) => {
    const itemName = item.serviceItem?.name || item.partItem?.name || "N/A";
    const itemType = item.itemType === "SERVICE" ? "Service" : "Part";
    const qty = item.qty;
    const price = item.priceSnapshot;
    const amount = qty * price;

    doc.text(itemName, 50, position, { width: 220, ellipsis: true });
    doc.text(itemType, 280, position);
    doc.text(qty.toString(), 370, position, { width: 50, align: "center" });
    doc.text(formatCurrency(price), 440, position, { width: 60, align: "right" });
    doc.text(formatCurrency(amount), 510, position, { width: 70, align: "right" });

    position += 25;
  });

  // Line above total
  doc.moveTo(50, position + 5).lineTo(550, position + 5).stroke();

  // ===== TOTAL =====
  position += 20;
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text("TOTAL", 400, position);
  doc.text(formatCurrency(booking.totalAmount), 510, position, { width: 70, align: "right" });

  // ===== GST BREAKDOWN (if applicable) =====
  // Assuming 18% GST
  const gstRate = 18;
  const baseAmount = Math.floor((booking.totalAmount * 100) / (100 + gstRate));
  const gstAmount = booking.totalAmount - baseAmount;

  position += 25;
  doc.fontSize(10).font("Helvetica");
  doc.text(`Base Amount:`, 400, position);
  doc.text(formatCurrency(baseAmount), 510, position, { width: 70, align: "right" });

  position += 15;
  doc.text(`GST (${gstRate}%):`, 400, position);
  doc.text(formatCurrency(gstAmount), 510, position, { width: 70, align: "right" });

  // ===== FOOTER =====
  const footerTop = 720;
  doc.fontSize(10).font("Helvetica-Bold").text("Terms & Conditions:", 50, footerTop);
  doc.fontSize(8).font("Helvetica");
  doc.text("1. Payment is due upon service completion.", 50, footerTop + 15);
  doc.text("2. All disputes subject to Mumbai jurisdiction.", 50, footerTop + 27);
  doc.text("3. This is a computer-generated invoice.", 50, footerTop + 39);

  doc.fontSize(10).font("Helvetica-Bold").text("Thank you for your business!", 50, footerTop + 60);

  // Finalize PDF
  doc.end();

  return streamToBuffer(stream);
}

// ========================================
// PDF GENERATION - MARKETPLACE ORDER INVOICE
// ========================================

export async function generateOrderInvoice(orderId: string): Promise<Buffer> {
  // Fetch order details
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      vendor: { select: { name: true, email: true, phone: true } },
      restaurant: {
        select: {
          name: true,
          address: true,
          city: true,
          pincode: true,
          fssaiNumber: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              name: true,
              description: true,
              unit: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // Create PDF document
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = new Readable({
    read() {},
  });
  doc.pipe(stream as any);

  // Invoice Number
  const invoiceNumber = generateInvoiceNumber("ORDER", order.id, order.createdAt);

  // ===== HEADER (VENDOR INFO) =====
  doc.fontSize(20).font("Helvetica-Bold").text(order.vendor.name, 50, 50);
  doc.fontSize(10).font("Helvetica");
  if (order.vendor.phone) {
    doc.text(`Phone: ${order.vendor.phone}`);
  }
  if (order.vendor.email) {
    doc.text(`Email: ${order.vendor.email}`);
  }

  // Horizontal line
  doc.moveTo(50, 120).lineTo(550, 120).stroke();

  // ===== INVOICE TITLE =====
  doc.fontSize(24).font("Helvetica-Bold").text("MARKETPLACE INVOICE", 50, 140);
  doc.fontSize(10).font("Helvetica").text(`Invoice #: ${invoiceNumber}`, 400, 145);
  doc.text(`Order Date: ${formatDate(order.createdAt)}`, 400, 160);
  doc.text(`Status: ${order.status}`, 400, 175);
  if (order.actualDeliveryDate) {
    doc.text(`Delivered: ${formatDate(order.actualDeliveryDate)}`, 400, 190);
  } else if (order.expectedDeliveryDate) {
    doc.text(`Expected: ${formatDate(order.expectedDeliveryDate)}`, 400, 190);
  }

  // ===== CUSTOMER DETAILS =====
  doc.fontSize(12).font("Helvetica-Bold").text("SHIP TO:", 50, 220);
  doc.fontSize(10).font("Helvetica").text(order.owner.name, 50, 240);
  doc.text(order.restaurant.name, 50, 255);
  doc.text(order.restaurant.address, 50, 270);
  doc.text(`${order.restaurant.city} - ${order.restaurant.pincode || "N/A"}`, 50, 285);
  if (order.owner.phone) {
    doc.text(`Phone: ${order.owner.phone}`, 50, 300);
  }

  // ===== ITEMS TABLE =====
  const tableTop = 340;
  doc.fontSize(11).font("Helvetica-Bold");

  // Table headers
  doc.text("Product", 50, tableTop);
  doc.text("Unit", 280, tableTop);
  doc.text("Qty", 350, tableTop, { width: 50, align: "center" });
  doc.text("Price", 420, tableTop, { width: 60, align: "right" });
  doc.text("Amount", 490, tableTop, { width: 90, align: "right" });

  // Line under headers
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  // Table rows
  let position = tableTop + 25;
  doc.font("Helvetica").fontSize(10);

  order.items.forEach((item) => {
    const productName = item.product.name;
    const unit = item.product.unit;
    const qty = item.qty;
    const price = item.priceSnapshot;
    const amount = qty * price;

    doc.text(productName, 50, position, { width: 220, ellipsis: true });
    doc.text(unit, 280, position);
    doc.text(qty.toString(), 350, position, { width: 50, align: "center" });
    doc.text(formatCurrency(price), 420, position, { width: 60, align: "right" });
    doc.text(formatCurrency(amount), 490, position, { width: 90, align: "right" });

    position += 25;
  });

  // Line above total
  doc.moveTo(50, position + 5).lineTo(550, position + 5).stroke();

  // ===== TOTAL =====
  position += 20;
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text("TOTAL", 400, position);
  doc.text(formatCurrency(order.totalAmount), 490, position, { width: 90, align: "right" });

  // ===== FOOTER =====
  const footerTop = 700;
  doc.fontSize(10).font("Helvetica-Bold").text("Notes:", 50, footerTop);
  doc.fontSize(8).font("Helvetica");
  if (order.statusNotes) {
    doc.text(order.statusNotes, 50, footerTop + 15, { width: 500 });
  }

  doc.fontSize(10).font("Helvetica-Bold").text("Thank you for your purchase!", 50, footerTop + 60);

  // Finalize PDF
  doc.end();

  return streamToBuffer(stream);
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
