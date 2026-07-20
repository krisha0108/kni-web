// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require("razorpay");
import crypto from "crypto";

// Lazy initialization — only create instance when actually needed (not at build time)
let _razorpay: any = null;

function getRazorpay() {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env");
    }
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

/**
 * Create a Razorpay order
 * @param amountInRupees - Amount in rupees. Will be converted to paise.
 */
export async function createRazorpayOrder(
  amountInRupees: number,
  receipt: string,
  notes?: Record<string, string>
) {
  const razorpay = getRazorpay();

  // Convert rupees to paise with correct rounding
  const amount = Math.round(amountInRupees * 100);
  if (amount <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }

  const order = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt,
    notes: notes || {},
  });
  return order;
}

/**
 * Verify Razorpay payment signature using HMAC SHA256
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

/**
 * Full payment verification: signature check PLUS a server-to-server fetch
 * of the order from Razorpay to confirm it was actually paid, and paid the
 * exact amount we expect for this specific transaction.
 *
 * The signature alone only proves "Razorpay issued this (order_id,
 * payment_id) pair" - it does NOT prove the order was created for the
 * transaction currently being verified. Without this order-fetch step, a
 * genuinely valid (order_id, payment_id, signature) triple from any other
 * real payment in the app (a ₹1 test payment, an unrelated booking, etc.)
 * could be replayed against a different, larger transaction and would pass
 * signature verification, since nothing checks that the *amount actually
 * paid* matches what's being credited here.
 *
 * Every call site already computes `expectedAmountInRupees` authoritatively
 * server-side (never from client input) - this just confirms Razorpay's own
 * records agree with that number before crediting anything.
 */
export async function verifyRazorpayPayment(
  orderId: string,
  paymentId: string,
  signature: string,
  expectedAmountInRupees: number
): Promise<{ valid: boolean; reason?: string }> {
  if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
    return { valid: false, reason: "Invalid payment signature" };
  }

  let order;
  try {
    order = await getRazorpay().orders.fetch(orderId);
  } catch {
    return { valid: false, reason: "Could not verify order with Razorpay" };
  }

  if (order.status !== "paid") {
    return { valid: false, reason: `Order is not paid (status: ${order.status})` };
  }

  const expectedAmountPaise = Math.round(expectedAmountInRupees * 100);
  if (order.amount !== expectedAmountPaise) {
    return { valid: false, reason: "Paid amount does not match the expected amount for this transaction" };
  }

  return { valid: true };
}

/**
 * Refund a captured Razorpay payment (full or partial). Used when a charge
 * succeeds but the order it was paying for can't actually be created (e.g. a
 * stock race lost between price-unlock and payment capture), so the owner
 * isn't left having paid for nothing.
 */
export async function refundRazorpayPayment(
  paymentId: string,
  amountInRupees: number,
  notes?: Record<string, string>
) {
  const amount = Math.round(amountInRupees * 100);
  return getRazorpay().payments.refund(paymentId, {
    amount,
    notes: notes || {},
  });
}

export default getRazorpay;
