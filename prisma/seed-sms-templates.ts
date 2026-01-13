import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const smsTemplates = [
  {
    name: "LOGIN_OTP",
    purpose: "LOGIN_OTP",
    template:
      "Your KNI Super App login OTP is {{otp}}. Valid for {{expiry}} minutes. Do not share this code with anyone.",
    variables: ["otp", "expiry"],
    description: "OTP for user login verification",
  },
  {
    name: "REGISTRATION_OTP",
    purpose: "REGISTRATION_OTP",
    template:
      "Welcome to KNI Super App! Your registration OTP is {{otp}}. Valid for {{expiry}} minutes.",
    variables: ["otp", "expiry"],
    description: "OTP for new user registration",
  },
  {
    name: "PASSWORD_RESET_OTP",
    purpose: "PASSWORD_RESET_OTP",
    template:
      "Your password reset OTP for KNI Super App is {{otp}}. Valid for {{expiry}} minutes. If you didn't request this, please ignore.",
    variables: ["otp", "expiry"],
    description: "OTP for password reset",
  },
  {
    name: "BOOKING_CONFIRMATION",
    purpose: "BOOKING_CONFIRMATION",
    template:
      "Hi {{name}}, your service booking #{{bookingId}} is confirmed for {{date}} at {{time}}. Amount: ₹{{amount}}. Thank you!",
    variables: ["name", "bookingId", "date", "time", "amount"],
    description: "Confirmation SMS after booking is created",
  },
  {
    name: "PAYMENT_VERIFIED",
    purpose: "PAYMENT_VERIFIED",
    template:
      "Payment of ₹{{amount}} for booking #{{bookingId}} has been verified. An engineer will be assigned soon.",
    variables: ["amount", "bookingId"],
    description: "SMS when payment proof is verified by admin",
  },
  {
    name: "ENGINEER_ASSIGNED",
    purpose: "ENGINEER_ASSIGNED",
    template:
      "Engineer {{engineerName}} has been assigned to your service on {{date}}. Contact: {{engineerPhone}}",
    variables: ["engineerName", "date", "engineerPhone"],
    description: "SMS when engineer is assigned to booking",
  },
  {
    name: "SERVICE_COMPLETED",
    purpose: "SERVICE_COMPLETED",
    template:
      "Your service booking #{{bookingId}} has been completed successfully. Thank you for choosing KNI Super App!",
    variables: ["bookingId"],
    description: "SMS when service is marked as completed",
  },
  {
    name: "MARKETPLACE_ORDER_PLACED",
    purpose: "ORDER_PLACED",
    template:
      "Your order #{{orderId}} from {{vendorName}} for ₹{{amount}} has been placed successfully. Expected delivery: {{expectedDate}}",
    variables: ["orderId", "vendorName", "amount", "expectedDate"],
    description: "SMS when marketplace order is placed",
  },
  {
    name: "MARKETPLACE_ORDER_CONFIRMED",
    purpose: "ORDER_CONFIRMED",
    template:
      "Your order #{{orderId}} has been confirmed by {{vendorName}}. It will be processed shortly.",
    variables: ["orderId", "vendorName"],
    description: "SMS when vendor confirms the order",
  },
  {
    name: "MARKETPLACE_ORDER_SHIPPED",
    purpose: "ORDER_SHIPPED",
    template:
      "Your order #{{orderId}} has been shipped! Expected delivery: {{expectedDate}}. Track your order in the app.",
    variables: ["orderId", "expectedDate"],
    description: "SMS when order is shipped",
  },
  {
    name: "MARKETPLACE_ORDER_DELIVERED",
    purpose: "ORDER_DELIVERED",
    template:
      "Your order #{{orderId}} has been delivered. Thank you for shopping with us!",
    variables: ["orderId"],
    description: "SMS when order is delivered",
  },
  {
    name: "AMC_RENEWAL_REMINDER",
    purpose: "AMC_REMINDER",
    template:
      "Hi {{name}}, your AMC subscription for {{equipmentName}} expires on {{expiryDate}}. Renew now to continue uninterrupted service.",
    variables: ["name", "equipmentName", "expiryDate"],
    description: "Reminder SMS for AMC renewal",
  },
  {
    name: "AMC_ACTIVATED",
    purpose: "AMC_ACTIVATED",
    template:
      "Your AMC subscription for {{equipmentName}} is now active. {{serviceLimit}} services included. Valid until {{endDate}}.",
    variables: ["equipmentName", "serviceLimit", "endDate"],
    description: "SMS when AMC subscription is activated",
  },
  {
    name: "LOW_STOCK_ALERT",
    purpose: "LOW_STOCK_ALERT",
    template:
      "Alert: {{itemName}} stock is running low ({{currentStock}} remaining). Please restock soon.",
    variables: ["itemName", "currentStock"],
    description: "Low stock alert for warehouse admin",
  },
  {
    name: "ENGINEER_JOB_ASSIGNED",
    purpose: "ENGINEER_JOB_ASSIGNED",
    template:
      "New job assigned! Booking #{{bookingId}} for {{date}} at {{time}}. Location: {{address}}. Accept in the app.",
    variables: ["bookingId", "date", "time", "address"],
    description: "SMS to engineer when job is assigned",
  },
  {
    name: "PAYOUT_PROCESSED",
    purpose: "PAYOUT_PROCESSED",
    template:
      "Your payout of ₹{{amount}} for booking #{{bookingId}} has been processed. Check your account.",
    variables: ["amount", "bookingId"],
    description: "SMS to engineer when payout is marked as paid",
  },
  {
    name: "VENDOR_APPROVED",
    purpose: "VENDOR_APPROVED",
    template:
      "Congratulations! Your vendor account has been approved. You can now start adding products and receiving orders.",
    variables: [],
    description: "SMS when vendor is approved by admin",
  },
  {
    name: "VENDOR_ORDER_RECEIVED",
    purpose: "VENDOR_ORDER_RECEIVED",
    template:
      "New order received! Order #{{orderId}} for ₹{{amount}} from {{restaurantName}}. Check your dashboard.",
    variables: ["orderId", "amount", "restaurantName"],
    description: "SMS to vendor when new order is placed",
  },
  {
    name: "RESTAURANT_APPROVED",
    purpose: "RESTAURANT_APPROVED",
    template:
      "Great news! {{restaurantName}} has been approved. You can now book services and place orders.",
    variables: ["restaurantName"],
    description: "SMS when restaurant is approved by admin",
  },
  {
    name: "TEAM_INVITATION",
    purpose: "TEAM_INVITATION",
    template:
      "{{inviterName}} has invited you to join {{restaurantName}} as {{role}}. Check your email for the invitation link.",
    variables: ["inviterName", "restaurantName", "role"],
    description: "SMS when team member is invited",
  },
];

async function seedSMSTemplates() {
  console.log("Seeding SMS templates...");

  for (const template of smsTemplates) {
    await prisma.sMSTemplate.upsert({
      where: { name: template.name },
      update: {
        ...template,
      },
      create: {
        ...template,
      },
    });
    console.log(`✓ ${template.name}`);
  }

  console.log("SMS templates seeded successfully!");
}

seedSMSTemplates()
  .catch((error) => {
    console.error("Error seeding SMS templates:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
