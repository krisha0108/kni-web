import nodemailer from "nodemailer";

const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || "noreply@knisuperapp.com";
const FROM_NAME = process.env.SMTP_FROM_NAME || process.env.SENDGRID_FROM_NAME || "KNI Super App";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Create nodemailer transporter (Gmail SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Base email sender
async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials not configured. Email not sent.");
    console.log("Would send email:", {
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });
    console.log(`Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

// Email template wrapper
function emailTemplate(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 30px 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background: #5568d3;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
          }
          .info-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .credentials {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .success {
            background: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          h2 {
            color: #667eea;
            font-size: 20px;
            margin-top: 0;
          }
          p {
            margin: 10px 0;
          }
          ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .divider {
            height: 1px;
            background: #e9ecef;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔧 ${FROM_NAME}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} KNI Super App. All rights reserved.</p>
            <p>Professional Kitchen Equipment Service Platform</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// 1. Engineer Welcome Email
export async function sendEngineerWelcomeEmail(
  engineerEmail: string,
  engineerName: string,
  password: string
): Promise<void> {
  const content = `
    <h2>Welcome to KNI Super App!</h2>
    <p>Hello ${engineerName},</p>
    <p>You have been registered as an engineer on the KNI Super App platform. You can now start accepting service jobs from restaurant owners.</p>

    <div class="credentials">
      <strong>Your Login Credentials:</strong>
      <ul>
        <li><strong>Email:</strong> ${engineerEmail}</li>
        <li><strong>Password:</strong> ${password}</li>
      </ul>
      <p><em>⚠️ Please change your password after first login for security.</em></p>
    </div>

    <a href="${APP_URL}/login" class="button">Login to Dashboard</a>

    <div class="divider"></div>

    <h3>What's Next?</h3>
    <ul>
      <li>Complete your profile with your skills and expertise</li>
      <li>Wait for job assignments from the admin</li>
      <li>Accept jobs and start earning</li>
      <li>Upload work completion proofs to get paid</li>
    </ul>

    <p>If you have any questions, please contact the admin.</p>
    <p>Best regards,<br>KNI Super App Team</p>
  `;

  await sendEmail({
    to: engineerEmail,
    subject: "Welcome to KNI Super App - Engineer Account Created",
    html: emailTemplate(content, "Welcome Engineer"),
  });
}

// 2. Booking Confirmation Email (Owner)
export async function sendBookingConfirmationEmail(
  ownerEmail: string,
  ownerName: string,
  bookingId: string,
  restaurantName: string,
  totalAmount: number,
  items: Array<{ name: string; quantity: number }>
): Promise<void> {
  const itemsList = items
    .map((item) => `<li>${item.name} x ${item.quantity}</li>`)
    .join("");

  const content = `
    <h2>Booking Confirmed!</h2>
    <p>Hello ${ownerName},</p>
    <p>Your service booking has been successfully created and is awaiting payment.</p>

    <div class="info-box">
      <strong>Booking Details:</strong>
      <ul>
        <li><strong>Booking ID:</strong> ${bookingId}</li>
        <li><strong>Restaurant:</strong> ${restaurantName}</li>
        <li><strong>Total Amount:</strong> ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</li>
      </ul>
    </div>

    <h3>Services & Parts:</h3>
    <ul>
      ${itemsList}
    </ul>

    <a href="${APP_URL}/owner/bookings/${bookingId}/payment" class="button">Proceed to Payment</a>

    <div class="divider"></div>

    <h3>Next Steps:</h3>
    <ol>
      <li>Click the button above to go to the payment page</li>
      <li>Scan the UPI QR code and make the payment</li>
      <li>Upload a screenshot of the payment confirmation</li>
      <li>Wait for admin verification</li>
      <li>An engineer will be assigned to your booking</li>
    </ol>

    <p>Thank you for choosing KNI Super App!</p>
    <p>Best regards,<br>KNI Super App Team</p>
  `;

  await sendEmail({
    to: ownerEmail,
    subject: `Booking Confirmed - ${restaurantName}`,
    html: emailTemplate(content, "Booking Confirmation"),
  });
}

// 3. Payment Verified Email (Owner)
export async function sendPaymentVerifiedEmail(
  ownerEmail: string,
  ownerName: string,
  bookingId: string,
  restaurantName: string
): Promise<void> {
  const content = `
    <h2>Payment Verified Successfully!</h2>
    <p>Hello ${ownerName},</p>

    <div class="success">
      <p><strong>✅ Your payment has been verified by our admin.</strong></p>
      <p>An engineer will be assigned to your booking shortly.</p>
    </div>

    <div class="info-box">
      <strong>Booking Details:</strong>
      <ul>
        <li><strong>Booking ID:</strong> ${bookingId}</li>
        <li><strong>Restaurant:</strong> ${restaurantName}</li>
      </ul>
    </div>

    <a href="${APP_URL}/owner/bookings/${bookingId}" class="button">View Booking Details</a>

    <h3>What Happens Next?</h3>
    <ul>
      <li>Our admin will assign a qualified engineer to your booking</li>
      <li>You will receive another email once the engineer is assigned</li>
      <li>The engineer will contact you to schedule the service</li>
      <li>Service will be completed as per the scheduled time</li>
    </ul>

    <p>Thank you for your patience!</p>
    <p>Best regards,<br>KNI Super App Team</p>
  `;

  await sendEmail({
    to: ownerEmail,
    subject: `Payment Verified - ${restaurantName}`,
    html: emailTemplate(content, "Payment Verified"),
  });
}

// 4. Engineer Assigned Email (Owner)
export async function sendEngineerAssignedEmail(
  ownerEmail: string,
  ownerName: string,
  bookingId: string,
  restaurantName: string,
  engineerName: string,
  engineerPhone: string
): Promise<void> {
  const content = `
    <h2>Engineer Assigned to Your Booking!</h2>
    <p>Hello ${ownerName},</p>
    <p>Great news! An engineer has been assigned to your service booking.</p>

    <div class="success">
      <strong>Engineer Details:</strong>
      <ul>
        <li><strong>Name:</strong> ${engineerName}</li>
        <li><strong>Phone:</strong> ${engineerPhone || "Not provided"}</li>
      </ul>
    </div>

    <div class="info-box">
      <strong>Booking Details:</strong>
      <ul>
        <li><strong>Booking ID:</strong> ${bookingId}</li>
        <li><strong>Restaurant:</strong> ${restaurantName}</li>
      </ul>
    </div>

    <a href="${APP_URL}/owner/bookings/${bookingId}" class="button">View Booking Details</a>

    <h3>What's Next?</h3>
    <ul>
      <li>The engineer will contact you to confirm the schedule</li>
      <li>Please be available at the restaurant during the scheduled time</li>
      <li>The engineer will complete the service and upload proof</li>
      <li>You'll receive a notification once the work is completed</li>
    </ul>

    <p>Thank you for choosing KNI Super App!</p>
    <p>Best regards,<br>KNI Super App Team</p>
  `;

  await sendEmail({
    to: ownerEmail,
    subject: `Engineer Assigned - ${restaurantName}`,
    html: emailTemplate(content, "Engineer Assigned"),
  });
}

// 5. New Job Assignment Email (Engineer)
export async function sendEngineerJobAssignmentEmail(
  engineerEmail: string,
  engineerName: string,
  assignmentId: string,
  restaurantName: string,
  restaurantAddress: string,
  ownerName: string,
  ownerPhone: string,
  items: Array<{ name: string; quantity: number }>
): Promise<void> {
  const itemsList = items
    .map((item) => `<li>${item.name} x ${item.quantity}</li>`)
    .join("");

  const content = `
    <h2>New Job Assignment!</h2>
    <p>Hello ${engineerName},</p>
    <p>You have been assigned a new service job. Please review the details and accept the assignment.</p>

    <div class="info-box">
      <strong>Job Location:</strong>
      <ul>
        <li><strong>Restaurant:</strong> ${restaurantName}</li>
        <li><strong>Address:</strong> ${restaurantAddress}</li>
      </ul>
    </div>

    <div class="info-box">
      <strong>Contact Person:</strong>
      <ul>
        <li><strong>Name:</strong> ${ownerName}</li>
        <li><strong>Phone:</strong> ${ownerPhone || "Not provided"}</li>
      </ul>
    </div>

    <h3>Services & Parts Required:</h3>
    <ul>
      ${itemsList}
    </ul>

    <a href="${APP_URL}/engineer/jobs/${assignmentId}" class="button">View Job Details</a>

    <h3>Action Required:</h3>
    <ol>
      <li>Click the button above to view full job details</li>
      <li>Accept the job assignment</li>
      <li>Contact the restaurant owner to schedule</li>
      <li>Complete the service work</li>
      <li>Upload completion proof</li>
    </ol>

    <p><em>Please respond to this assignment as soon as possible.</em></p>
    <p>Best regards,<br>KNI Super App Team</p>
  `;

  await sendEmail({
    to: engineerEmail,
    subject: `New Job Assignment - ${restaurantName}`,
    html: emailTemplate(content, "New Job Assignment"),
  });
}

// 6. Work Completed Email (Owner)
export async function sendWorkCompletedEmail(
  ownerEmail: string,
  ownerName: string,
  bookingId: string,
  restaurantName: string,
  engineerName: string,
  workNotes: string
): Promise<void> {
  const content = `
    <h2>Service Work Completed!</h2>
    <p>Hello ${ownerName},</p>

    <div class="success">
      <p><strong>✅ Your service booking has been completed successfully!</strong></p>
    </div>

    <div class="info-box">
      <strong>Booking Details:</strong>
      <ul>
        <li><strong>Booking ID:</strong> ${bookingId}</li>
        <li><strong>Restaurant:</strong> ${restaurantName}</li>
        <li><strong>Engineer:</strong> ${engineerName}</li>
      </ul>
    </div>

    ${
      workNotes
        ? `
    <div class="info-box">
      <strong>Work Completion Notes:</strong>
      <p>${workNotes}</p>
    </div>
    `
        : ""
    }

    <a href="${APP_URL}/owner/bookings/${bookingId}" class="button">View Completion Details</a>

    <p>The engineer has uploaded proof of the completed work. You can view it in your booking details.</p>

    <h3>Need Support?</h3>
    <p>If you face any issues or have concerns about the completed work, please contact our admin team.</p>

    <p>Thank you for using KNI Super App!</p>
    <p>Best regards,<br>KNI Super App Team</p>
  `;

  await sendEmail({
    to: ownerEmail,
    subject: `Service Completed - ${restaurantName}`,
    html: emailTemplate(content, "Service Completed"),
  });
}

// 7. Payment Rejected Email (Owner)
export async function sendPaymentRejectedEmail(
  ownerEmail: string,
  ownerName: string,
  bookingId: string,
  restaurantName: string,
  rejectionReason: string
): Promise<void> {
  const content = `
    <h2>Payment Verification Failed</h2>
    <p>Hello ${ownerName},</p>

    <div class="credentials">
      <p><strong>⚠️ Your payment proof has been rejected by our admin.</strong></p>
    </div>

    <div class="info-box">
      <strong>Booking Details:</strong>
      <ul>
        <li><strong>Booking ID:</strong> ${bookingId}</li>
        <li><strong>Restaurant:</strong> ${restaurantName}</li>
      </ul>
    </div>

    <div class="info-box">
      <strong>Rejection Reason:</strong>
      <p>${rejectionReason}</p>
    </div>

    <a href="${APP_URL}/owner/bookings/${bookingId}/payment" class="button">Reupload Payment Proof</a>

    <h3>Next Steps:</h3>
    <ol>
      <li>Review the rejection reason above</li>
      <li>Ensure you have made the correct payment</li>
      <li>Upload a clear screenshot showing the payment confirmation</li>
      <li>Include transaction ID and amount in the screenshot</li>
    </ol>

    <p>If you believe this is a mistake, please contact our admin team.</p>
    <p>Best regards,<br>KNI Super App Team</p>
  `;

  await sendEmail({
    to: ownerEmail,
    subject: `Payment Verification Failed - ${restaurantName}`,
    html: emailTemplate(content, "Payment Rejected"),
  });
}

// 8. Team Invitation Email
export async function sendTeamInvitationEmail(
  to: string,
  inviterName: string,
  restaurantName: string,
  role: string,
  inviteToken: string,
  isNewUser: boolean,
  tempPassword?: string
): Promise<void> {
  const acceptUrl = `${APP_URL}/owner/team/accept?token=${inviteToken}`;

  const roleDescriptions: Record<string, string> = {
    MANAGER: "Full access to manage bookings, equipment, expenses, and AMC subscriptions",
    ACCOUNTANT: "Access to manage expenses and view financial reports",
    VIEWER: "Read-only access to view restaurant data and reports"
  };

  const content = `
    <h2>You're Invited to Join a Restaurant Team!</h2>
    <p>Hello,</p>
    <p><strong>${inviterName}</strong> has invited you to join the team at <strong>${restaurantName}</strong> on KNI Super App.</p>

    <div class="info-box">
      <strong>Your Role:</strong> ${role}
      <p>${roleDescriptions[role] || "Team member access"}</p>
    </div>

    ${
      isNewUser && tempPassword
        ? `
    <div class="credentials">
      <strong>⚠️ New Account Created</strong>
      <p>An account has been created for you. You'll set your own password when accepting the invitation.</p>
      <ul>
        <li><strong>Email:</strong> ${to}</li>
      </ul>
    </div>
    `
        : `
    <div class="success">
      <p>✅ Your existing KNI Super App account will be used for this team membership.</p>
    </div>
    `
    }

    <a href="${acceptUrl}" class="button">Accept Invitation</a>

    <div class="divider"></div>

    <h3>What's Next?</h3>
    <ol>
      <li>Click the button above to accept the invitation</li>
      ${isNewUser ? "<li>Set your password for the account</li>" : ""}
      <li>Login to your KNI Super App account</li>
      <li>Select ${restaurantName} from the restaurant switcher</li>
      <li>Start collaborating with the team!</li>
    </ol>

    <div class="credentials">
      <strong>⚠️ Important:</strong>
      <p>This invitation link will expire in <strong>7 days</strong>. Please accept it before then.</p>
    </div>

    <h3>About ${restaurantName}</h3>
    <p>You'll have ${role.toLowerCase()} access to manage and collaborate on:</p>
    <ul>
      <li>Equipment maintenance and AMC subscriptions</li>
      <li>Service bookings and engineer assignments</li>
      <li>Expenses and financial tracking</li>
      <li>Marketplace orders and vendor management</li>
    </ul>

    <p>If you didn't expect this invitation or have any questions, please contact ${inviterName} or our support team.</p>
    <p>Best regards,<br>KNI Super App Team</p>
  `;

  await sendEmail({
    to,
    subject: `You're Invited to Join ${restaurantName} - KNI Super App`,
    html: emailTemplate(content, "Team Invitation"),
  });
}

// 9. Order Status Update Email (Owner)
export async function sendOrderStatusUpdateEmail(
  ownerEmail: string,
  ownerName: string,
  orderId: string,
  restaurantName: string,
  oldStatus: string,
  newStatus: string,
  statusNotes: string | null,
  vendorName: string,
  orderTotal: number,
  expectedDeliveryDate?: string | null,
  actualDeliveryDate?: string | null
): Promise<void> {
  const statusDescriptions: Record<string, string> = {
    PLACED: "Your order has been placed and is awaiting vendor confirmation.",
    CONFIRMED: "Your order has been confirmed by the vendor and will be processed soon.",
    PROCESSING: "Your order is currently being processed and prepared for shipment.",
    SHIPPED: "Your order has been shipped and is on its way to your restaurant.",
    DELIVERED: "Your order has been successfully delivered. Thank you for your purchase!",
    CANCELLED: "Your order has been cancelled. If you have questions, please contact the vendor.",
  };

  const statusColors: Record<string, string> = {
    PLACED: "#6c757d",
    CONFIRMED: "#0d6efd",
    PROCESSING: "#0dcaf0",
    SHIPPED: "#fd7e14",
    DELIVERED: "#198754",
    CANCELLED: "#dc3545",
  };

  const content = `
    <h2>Order Status Updated</h2>
    <p>Hello ${ownerName},</p>
    <p>Your marketplace order status has been updated.</p>

    <div class="info-box">
      <strong>Order Details:</strong>
      <ul>
        <li><strong>Order ID:</strong> #${orderId.slice(0, 8).toUpperCase()}</li>
        <li><strong>Restaurant:</strong> ${restaurantName}</li>
        <li><strong>Vendor:</strong> ${vendorName}</li>
        <li><strong>Total Amount:</strong> ₹${orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</li>
      </ul>
    </div>

    <div style="background: ${statusColors[newStatus]}20; border-left: 4px solid ${statusColors[newStatus]}; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p><strong>Status:</strong> <span style="color: ${statusColors[oldStatus]};">${oldStatus}</span> → <span style="color: ${statusColors[newStatus]};">${newStatus}</span></p>
      <p>${statusDescriptions[newStatus]}</p>
    </div>

    ${
      statusNotes
        ? `
    <div class="info-box">
      <strong>Vendor Notes:</strong>
      <p>${statusNotes}</p>
    </div>
    `
        : ""
    }

    ${
      expectedDeliveryDate
        ? `
    <div class="info-box">
      <strong>Expected Delivery:</strong>
      <p>${new Date(expectedDeliveryDate).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</p>
    </div>
    `
        : ""
    }

    ${
      actualDeliveryDate
        ? `
    <div class="success">
      <strong>✅ Delivered On:</strong>
      <p>${new Date(actualDeliveryDate).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</p>
    </div>
    `
        : ""
    }

    <a href="${APP_URL}/owner/marketplace/orders/${orderId}" class="button">View Order Details</a>

    ${
      newStatus === "DELIVERED"
        ? `
    <div class="divider"></div>
    <h3>Thank You for Your Order!</h3>
    <p>We hope you're satisfied with your purchase. If you have any issues with the delivered items, please contact the vendor directly.</p>
    `
        : newStatus === "CANCELLED"
        ? `
    <div class="divider"></div>
    <h3>Order Cancelled</h3>
    <p>If you didn't request this cancellation or have any questions, please contact the vendor or our support team.</p>
    `
        : newStatus === "SHIPPED"
        ? `
    <div class="divider"></div>
    <h3>Track Your Order</h3>
    <p>Your order is on its way! Please ensure someone is available at the restaurant to receive the delivery.</p>
    `
        : ""
    }

    <p>Best regards,<br>KNI Super App Team</p>
  `;

  await sendEmail({
    to: ownerEmail,
    subject: `Order ${newStatus} - ${restaurantName} (#${orderId.slice(0, 8).toUpperCase()})`,
    html: emailTemplate(content, "Order Status Update"),
  });
}

// 10. Email Verification Code
export async function sendEmailVerificationCode(
  email: string,
  name: string,
  code: string
): Promise<void> {
  const content = `
    <h2>Verify Your Email Address</h2>
    <p>Hello ${name},</p>
    <p>Thank you for registering on KNI Super App. Please use the following verification code to verify your email address:</p>

    <div style="text-align: center; margin: 30px 0;">
      <div style="display: inline-block; background: #f0f4ff; border: 2px dashed #667eea; border-radius: 12px; padding: 20px 40px;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea;">${code}</span>
      </div>
    </div>

    <div class="credentials">
      <strong>Important:</strong>
      <ul>
        <li>This code is valid for <strong>10 minutes</strong></li>
        <li>Do not share this code with anyone</li>
        <li>If you didn't create an account, please ignore this email</li>
      </ul>
    </div>

    <p>Best regards,<br>KNI Super App Team</p>
  `;

  await sendEmail({
    to: email,
    subject: `${code} - Email Verification Code | KNI Super App`,
    html: emailTemplate(content, "Email Verification"),
  });
}

// 11. Password Reset Code
export async function sendPasswordResetCode(
  email: string,
  name: string,
  code: string
): Promise<void> {
  const content = `
    <h2>Password Reset Request</h2>
    <p>Hello ${name},</p>
    <p>We received a request to reset your password. Use the following code to proceed:</p>

    <div style="text-align: center; margin: 30px 0;">
      <div style="display: inline-block; background: #fff3cd; border: 2px dashed #ffc107; border-radius: 12px; padding: 20px 40px;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #856404;">${code}</span>
      </div>
    </div>

    <div class="credentials">
      <strong>Important:</strong>
      <ul>
        <li>This code is valid for <strong>10 minutes</strong></li>
        <li>Do not share this code with anyone</li>
        <li>If you didn't request a password reset, please ignore this email</li>
      </ul>
    </div>

    <p>Best regards,<br>KNI Super App Team</p>
  `;

  await sendEmail({
    to: email,
    subject: `${code} - Password Reset Code | KNI Super App`,
    html: emailTemplate(content, "Password Reset"),
  });
}

// 12. Launch Pad Inquiry Response Email
export async function sendLaunchPadResponseEmail(
  to: string,
  inquiryPersonName: string,
  businessType: string,
  subject: string,
  messageBody: string,
  senderName: string,
  portalUrl?: string,
): Promise<void> {
  const content = `
    <h2>${subject}</h2>
    <p>Hello ${inquiryPersonName},</p>

    <p>Thank you for your interest in starting your <strong>${businessType.replace(/_/g, " ").toLowerCase()}</strong> business with KNI!</p>

    <div class="info-box">
      ${messageBody.split("\n").map((line: string) => `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join("")}
    </div>

    ${portalUrl ? `
    <div class="divider"></div>
    <div style="text-align: center; margin: 20px 0;">
      <p>You can view your inquiry details and reply directly:</p>
      <a href="${portalUrl}" style="display: inline-block; padding: 14px 32px; background: #EF3A3A; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View & Reply to Your Inquiry</a>
    </div>
    ` : ""}

    <div class="divider"></div>

    <h3>What KNI Can Help You With:</h3>
    <ul>
      <li><strong>Kitchen Design & Layout</strong> — Optimized for your business type</li>
      <li><strong>Equipment Sourcing</strong> — Quality commercial equipment at best prices</li>
      <li><strong>AMC & Maintenance</strong> — Keep your kitchen running smoothly</li>
      <li><strong>Manpower Sourcing</strong> — Trained kitchen professionals</li>
    </ul>

    <a href="${APP_URL}/landing/launchpad.html" class="button">Visit Launch Pad</a>

    <div class="divider"></div>

    <p>If you have any questions, feel free to reply to this email or call us directly.</p>
    <p>Best regards,<br>${senderName}<br>KNI Super App Team</p>
  `;

  await sendEmail({
    to,
    subject: `${subject} - KNI Launch Pad`,
    html: emailTemplate(content, "KNI Launch Pad"),
  });
}

/**
 * Send Service PIN email to owner
 */
export async function sendServicePinEmail(
  to: string,
  ownerName: string,
  pin: string,
  purpose: "START" | "COMPLETE",
  engineerName: string,
  bookingId: string
): Promise<void> {
  const actionText = purpose === "START" ? "start work on your equipment" : "mark the service as complete";

  const content = `
    <h2>Service PIN</h2>
    <p>Hi ${ownerName},</p>
    <p>Engineer <strong>${engineerName}</strong> wants to <strong>${actionText}</strong>.</p>

    <div style="text-align: center; margin: 30px 0;">
      <div style="display: inline-block; background: #f0f4ff; border: 2px solid #667eea; border-radius: 12px; padding: 20px 40px;">
        <p style="margin: 0 0 5px 0; font-size: 14px; color: #6c757d;">Your Service PIN</p>
        <p style="margin: 0; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #667eea;">${pin}</p>
      </div>
    </div>

    <div class="credentials">
      <p><strong>⏰ This PIN expires in 10 minutes.</strong></p>
      <p>Share this PIN with the engineer only when they are physically present at your location.</p>
    </div>

    <div class="info-box">
      <p><strong>Booking ID:</strong> ${bookingId.slice(-8)}</p>
      <p><strong>Engineer:</strong> ${engineerName}</p>
      <p><strong>Action:</strong> ${purpose === "START" ? "Start Work" : "Complete Work"}</p>
    </div>

    <p>If you did not request this service, please contact us immediately.</p>
  `;

  await sendEmail({
    to,
    subject: `Service PIN: ${pin} - Engineer ${engineerName} wants to ${actionText}`,
    html: emailTemplate(content, "Service PIN"),
  });
}

export default {
  sendEngineerWelcomeEmail,
  sendBookingConfirmationEmail,
  sendPaymentVerifiedEmail,
  sendEngineerAssignedEmail,
  sendEngineerJobAssignmentEmail,
  sendWorkCompletedEmail,
  sendPaymentRejectedEmail,
  sendTeamInvitationEmail,
  sendOrderStatusUpdateEmail,
  sendEmailVerificationCode,
  sendPasswordResetCode,
  sendLaunchPadResponseEmail,
  sendServicePinEmail,
};
