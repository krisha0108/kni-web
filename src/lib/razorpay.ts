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
 * @param amountInRupees - Amount in whole rupees (integer). Will be converted to paise.
 */
export async function createRazorpayOrder(
  amountInRupees: number,
  receipt: string,
  notes?: Record<string, string>
) {
  const razorpay = getRazorpay();

  // Ensure amount is a positive integer (rupees, not paise)
  const amount = Math.round(Math.abs(amountInRupees)) * 100;
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

export default getRazorpay;
