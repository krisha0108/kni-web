import nodemailer from "nodemailer";

const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "noreply@kni-super-app.com";
const FROM_NAME = process.env.SMTP_FROM_NAME || "KNI Super App";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Create reusable SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using Nodemailer (Gmail SMTP)
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP credentials not configured. Email not sent.");
      console.log("Email details:", { to: input.to, subject: input.subject });
      return false;
    }

    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    console.log(`Email sent successfully to ${input.to}`);
    return true;
  } catch (error: any) {
    console.error("Email send error:", error);
    return false;
  }
}

/**
 * Send team invitation email
 */
export async function sendTeamInvitationEmail(params: {
  to: string;
  toName: string;
  inviterName: string;
  restaurantName: string;
  role: string;
  inviteToken: string;
  isNewUser: boolean;
  tempPassword?: string;
}): Promise<boolean> {
  const {
    to,
    toName,
    inviterName,
    restaurantName,
    role,
    inviteToken,
    isNewUser,
    tempPassword,
  } = params;

  const acceptUrl = `${APP_URL}/team/accept?token=${inviteToken}`;

  const subject = `Invitation to join ${restaurantName} team on KNI Super App`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .info-box {
      background: #f7f7f7;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #666;
      font-size: 14px;
    }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Team Invitation</h1>
  </div>

  <div class="content">
    <h2>Hi ${toName},</h2>

    <p><strong>${inviterName}</strong> has invited you to join the <strong>${restaurantName}</strong> team on KNI Super App as a <strong>${role}</strong>.</p>

    <div class="info-box">
      <strong>Invitation Details:</strong>
      <ul style="margin: 10px 0;">
        <li><strong>Restaurant:</strong> ${restaurantName}</li>
        <li><strong>Role:</strong> ${role}</li>
        <li><strong>Invited by:</strong> ${inviterName}</li>
      </ul>
    </div>

    ${
      isNewUser && tempPassword
        ? `
    <div class="warning">
      <strong>⚠️ Account Setup Required</strong>
      <p>A new account has been created for you. Your temporary password is:</p>
      <p style="font-family: monospace; background: white; padding: 10px; border-radius: 4px; font-size: 16px; font-weight: bold;">
        ${tempPassword}
      </p>
      <p><em>Please change this password after your first login.</em></p>
    </div>
    `
        : ""
    }

    <p>Click the button below to accept this invitation:</p>

    <div style="text-align: center;">
      <a href="${acceptUrl}" class="button">Accept Invitation</a>
    </div>

    <p style="color: #666; font-size: 14px;">
      Or copy and paste this link into your browser:<br>
      <a href="${acceptUrl}">${acceptUrl}</a>
    </p>

    <div class="warning" style="margin-top: 30px;">
      <strong>⏰ Important:</strong> This invitation will expire in 7 days.
    </div>
  </div>

  <div class="footer">
    <p>This is an automated email from KNI Super App.</p>
    <p>If you did not expect this invitation, please ignore this email.</p>
  </div>
</body>
</html>
  `;

  const text = `
Hi ${toName},

${inviterName} has invited you to join the ${restaurantName} team on KNI Super App as a ${role}.

${
  isNewUser && tempPassword
    ? `\nA new account has been created for you. Your temporary password is: ${tempPassword}\nPlease change this password after your first login.\n`
    : ""
}

Accept this invitation by clicking the link below:
${acceptUrl}

This invitation will expire in 7 days.

---
KNI Super App
  `;

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  toName: string;
  resetToken: string;
}): Promise<boolean> {
  const { to, toName, resetToken } = params;

  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  const subject = "Reset Your Password - KNI Super App";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h2>Reset Your Password</h2>

  <p>Hi ${toName},</p>

  <p>We received a request to reset your password for KNI Super App.</p>

  <p>Click the button below to reset your password:</p>

  <div style="text-align: center;">
    <a href="${resetUrl}" class="button">Reset Password</a>
  </div>

  <p>Or copy and paste this link: ${resetUrl}</p>

  <p><strong>This link will expire in 1 hour.</strong></p>

  <p>If you didn't request this, please ignore this email.</p>

  <hr>
  <p style="color: #666; font-size: 14px;">KNI Super App</p>
</body>
</html>
  `;

  const text = `
Hi ${toName},

We received a request to reset your password for KNI Super App.

Click this link to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

---
KNI Super App
  `;

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}

/**
 * Send welcome email for new users
 */
export async function sendWelcomeEmail(params: {
  to: string;
  toName: string;
  role: string;
}): Promise<boolean> {
  const { to, toName, role } = params;

  const subject = `Welcome to KNI Super App!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to KNI Super App</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to KNI Super App! 🎉</h1>
  </div>

  <p>Hi ${toName},</p>

  <p>Thank you for joining KNI Super App as a ${role}!</p>

  <p>You now have access to our comprehensive platform for managing kitchen equipment, bookings, and marketplace operations.</p>

  <div style="text-align: center;">
    <a href="${APP_URL}" class="button">Get Started</a>
  </div>

  <p>If you have any questions, feel free to reach out to our support team.</p>

  <p>Best regards,<br>The KNI Super App Team</p>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
}
