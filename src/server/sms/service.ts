import { db } from "@/server/db";
import { OTPPurpose, SMSStatus } from "@prisma/client";

// SMS Configuration
const SMS_CONFIG = {
  provider: process.env.SMS_PROVIDER || "MSG91", // MSG91, TWILIO, or TEST
  msg91AuthKey: process.env.MSG91_AUTH_KEY || "",
  msg91SenderId: process.env.MSG91_SENDER_ID || "KNISUP",
  msg91Route: process.env.MSG91_ROUTE || "4", // 4 = Transactional
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || "10"),
  maxOtpAttempts: parseInt(process.env.MAX_OTP_ATTEMPTS || "3"),
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Formats phone number to E.164 format (+91XXXXXXXXXX)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");

  // If starts with 91, add +
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  // If 10 digits, add +91
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  // Return as is with + prefix if not already present
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

/**
 * Validates Indian phone number
 */
export function isValidIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  // Must be 10 digits or 12 digits starting with 91
  return (
    (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) ||
    (cleaned.length === 12 && /^91[6-9]\d{9}$/.test(cleaned))
  );
}

/**
 * Generates a 6-digit OTP code
 */
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Replaces template variables with actual values
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return message;
}

// ========================================
// SMS PROVIDERS
// ========================================

/**
 * Send SMS using MSG91 (Popular in India)
 */
async function sendViaMSG91(
  phone: string,
  message: string
): Promise<{ success: boolean; providerId?: string; error?: string }> {
  const formattedPhone = formatPhoneNumber(phone);
  const mobiles = formattedPhone.replace("+91", ""); // MSG91 expects 10-digit number

  try {
    const response = await fetch(
      `https://api.msg91.com/api/v5/flow/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: SMS_CONFIG.msg91AuthKey,
        },
        body: JSON.stringify({
          flow_id: process.env.MSG91_FLOW_ID || "",
          sender: SMS_CONFIG.msg91SenderId,
          mobiles,
          VAR1: message, // Variable for template
        }),
      }
    );

    const data = await response.json();

    if (data.type === "success") {
      return { success: true, providerId: data.message };
    } else {
      return { success: false, error: data.message || "MSG91 sending failed" };
    }
  } catch (error) {
    console.error("MSG91 SMS Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send SMS using Twilio
 */
async function sendViaTwilio(
  phone: string,
  message: string
): Promise<{ success: boolean; providerId?: string; error?: string }> {
  const formattedPhone = formatPhoneNumber(phone);

  try {
    const auth = Buffer.from(
      `${SMS_CONFIG.twilioAccountSid}:${SMS_CONFIG.twilioAuthToken}`
    ).toString("base64");

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${SMS_CONFIG.twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: SMS_CONFIG.twilioPhoneNumber,
          Body: message,
        }),
      }
    );

    const data = await response.json();

    if (data.sid) {
      return { success: true, providerId: data.sid };
    } else {
      return {
        success: false,
        error: data.message || "Twilio sending failed",
      };
    }
  } catch (error) {
    console.error("Twilio SMS Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Test mode - logs SMS instead of sending
 */
async function sendViaTestMode(
  phone: string,
  message: string
): Promise<{ success: boolean; providerId?: string; error?: string }> {
  console.log("=====================================");
  console.log("TEST MODE - SMS NOT ACTUALLY SENT");
  console.log(`To: ${phone}`);
  console.log(`Message: ${message}`);
  console.log("=====================================");
  return { success: true, providerId: "TEST_" + Date.now() };
}

// ========================================
// CORE SMS FUNCTIONS
// ========================================

export interface SendSMSInput {
  phone: string;
  message: string;
  purpose?: string;
}

/**
 * Send SMS via configured provider
 */
export async function sendSMS(input: SendSMSInput): Promise<{
  success: boolean;
  logId: string;
  error?: string;
}> {
  const { phone, message, purpose } = input;

  // Validate phone number
  if (!isValidIndianPhone(phone)) {
    return {
      success: false,
      logId: "",
      error: "Invalid phone number format",
    };
  }

  const formattedPhone = formatPhoneNumber(phone);

  // Choose provider based on configuration
  let result: { success: boolean; providerId?: string; error?: string };

  switch (SMS_CONFIG.provider) {
    case "MSG91":
      result = await sendViaMSG91(formattedPhone, message);
      break;
    case "TWILIO":
      result = await sendViaTwilio(formattedPhone, message);
      break;
    case "TEST":
      result = await sendViaTestMode(formattedPhone, message);
      break;
    default:
      result = await sendViaTestMode(formattedPhone, message);
  }

  // Log SMS in database
  const log = await db.sMSLog.create({
    data: {
      phone: formattedPhone,
      message,
      purpose: purpose || null,
      status: result.success ? SMSStatus.SENT : SMSStatus.FAILED,
      providerId: result.providerId || null,
      errorMessage: result.error || null,
      deliveredAt: result.success ? new Date() : null,
    },
  });

  return {
    success: result.success,
    logId: log.id,
    error: result.error,
  };
}

/**
 * Send SMS using a template
 */
export async function sendSMSFromTemplate(
  phone: string,
  templateName: string,
  variables: Record<string, string>,
  purpose?: string
): Promise<{
  success: boolean;
  logId: string;
  error?: string;
}> {
  // Fetch template from database
  const template = await db.sMSTemplate.findFirst({
    where: {
      name: templateName,
      isActive: true,
    },
  });

  if (!template) {
    return {
      success: false,
      logId: "",
      error: `SMS template '${templateName}' not found`,
    };
  }

  // Replace variables in template
  const message = replaceTemplateVariables(template.template, variables);

  // Send SMS
  return await sendSMS({
    phone,
    message,
    purpose: purpose || template.purpose,
  });
}

// ========================================
// OTP FUNCTIONS
// ========================================

export interface GenerateOTPInput {
  phone: string;
  purpose: OTPPurpose;
}

/**
 * Generate and send OTP
 */
export async function generateAndSendOTP(
  input: GenerateOTPInput
): Promise<{
  success: boolean;
  otpId: string;
  error?: string;
}> {
  const { phone, purpose } = input;

  // Validate phone
  if (!isValidIndianPhone(phone)) {
    return {
      success: false,
      otpId: "",
      error: "Invalid phone number format",
    };
  }

  const formattedPhone = formatPhoneNumber(phone);

  // Check for recent OTP (rate limiting)
  const recentOTP = await db.oTP.findFirst({
    where: {
      phone: formattedPhone,
      purpose,
      createdAt: {
        gte: new Date(Date.now() - 60000), // Last 1 minute
      },
    },
  });

  if (recentOTP) {
    return {
      success: false,
      otpId: "",
      error: "Please wait 1 minute before requesting another OTP",
    };
  }

  // Generate OTP code
  const code = generateOTPCode();
  const expiresAt = new Date(Date.now() + SMS_CONFIG.otpExpiryMinutes * 60000);

  // Save OTP to database
  const otp = await db.oTP.create({
    data: {
      phone: formattedPhone,
      code,
      purpose,
      expiresAt,
    },
  });

  // Send OTP via SMS
  const message = `Your KNI Super App OTP is ${code}. Valid for ${SMS_CONFIG.otpExpiryMinutes} minutes. Do not share this code.`;

  const smsResult = await sendSMS({
    phone: formattedPhone,
    message,
    purpose: `OTP_${purpose}`,
  });

  if (!smsResult.success) {
    return {
      success: false,
      otpId: otp.id,
      error: smsResult.error || "Failed to send OTP SMS",
    };
  }

  return {
    success: true,
    otpId: otp.id,
  };
}

export interface VerifyOTPInput {
  phone: string;
  code: string;
  purpose: OTPPurpose;
}

/**
 * Verify OTP code
 */
export async function verifyOTP(
  input: VerifyOTPInput
): Promise<{
  success: boolean;
  otpId?: string;
  error?: string;
}> {
  const { phone, code, purpose } = input;

  const formattedPhone = formatPhoneNumber(phone);

  // Find the most recent unverified OTP for this phone and purpose
  const otp = await db.oTP.findFirst({
    where: {
      phone: formattedPhone,
      purpose,
      isVerified: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!otp) {
    return {
      success: false,
      error: "No OTP found for this phone number",
    };
  }

  // Check if OTP is expired
  if (new Date() > otp.expiresAt) {
    return {
      success: false,
      otpId: otp.id,
      error: "OTP has expired. Please request a new one",
    };
  }

  // Check max attempts
  if (otp.attempts >= SMS_CONFIG.maxOtpAttempts) {
    return {
      success: false,
      otpId: otp.id,
      error: "Maximum verification attempts exceeded. Please request a new OTP",
    };
  }

  // Increment attempts
  await db.oTP.update({
    where: { id: otp.id },
    data: {
      attempts: otp.attempts + 1,
    },
  });

  // Verify code
  if (otp.code !== code) {
    return {
      success: false,
      otpId: otp.id,
      error: "Invalid OTP code",
    };
  }

  // Mark as verified
  await db.oTP.update({
    where: { id: otp.id },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  return {
    success: true,
    otpId: otp.id,
  };
}

// ========================================
// HELPER SMS FUNCTIONS
// ========================================

/**
 * Send booking confirmation SMS
 */
export async function sendBookingConfirmationSMS(
  phone: string,
  bookingId: string,
  amount: number,
  slotDate: string
): Promise<void> {
  const message = `Your service booking #${bookingId.slice(-8)} is confirmed for ${slotDate}. Amount: ₹${(amount / 100).toFixed(2)}. Thank you for choosing KNI Super App!`;

  await sendSMS({
    phone,
    message,
    purpose: "BOOKING_CONFIRMATION",
  });
}

/**
 * Send payment received SMS
 */
export async function sendPaymentReceivedSMS(
  phone: string,
  amount: number,
  bookingId: string
): Promise<void> {
  const message = `Payment of ₹${(amount / 100).toFixed(2)} received for booking #${bookingId.slice(-8)}. Your booking will be processed shortly.`;

  await sendSMS({
    phone,
    message,
    purpose: "PAYMENT_RECEIVED",
  });
}

/**
 * Send engineer assigned SMS
 */
export async function sendEngineerAssignedSMS(
  phone: string,
  engineerName: string,
  engineerPhone: string,
  slotDate: string
): Promise<void> {
  const message = `Engineer ${engineerName} has been assigned to your service on ${slotDate}. Contact: ${engineerPhone}`;

  await sendSMS({
    phone,
    message,
    purpose: "ENGINEER_ASSIGNED",
  });
}

/**
 * Send service completed SMS
 */
export async function sendServiceCompletedSMS(
  phone: string,
  bookingId: string
): Promise<void> {
  const message = `Your service booking #${bookingId.slice(-8)} has been completed successfully. Thank you for using KNI Super App!`;

  await sendSMS({
    phone,
    message,
    purpose: "SERVICE_COMPLETED",
  });
}

/**
 * Send marketplace order placed SMS
 */
export async function sendOrderPlacedSMS(
  phone: string,
  orderId: string,
  amount: number,
  vendorName: string
): Promise<void> {
  const message = `Your order #${orderId.slice(-8)} from ${vendorName} for ₹${(amount / 100).toFixed(2)} has been placed successfully.`;

  await sendSMS({
    phone,
    message,
    purpose: "ORDER_PLACED",
  });
}

/**
 * Send order shipped SMS
 */
export async function sendOrderShippedSMS(
  phone: string,
  orderId: string,
  expectedDelivery: string
): Promise<void> {
  const message = `Your order #${orderId.slice(-8)} has been shipped. Expected delivery: ${expectedDelivery}`;

  await sendSMS({
    phone,
    message,
    purpose: "ORDER_SHIPPED",
  });
}

/**
 * Send order delivered SMS
 */
export async function sendOrderDeliveredSMS(
  phone: string,
  orderId: string
): Promise<void> {
  const message = `Your order #${orderId.slice(-8)} has been delivered. Thank you for your purchase!`;

  await sendSMS({
    phone,
    message,
    purpose: "ORDER_DELIVERED",
  });
}
