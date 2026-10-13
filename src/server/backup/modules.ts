/**
 * Admin Backup Management: registry of every data "module" that can be
 * downloaded, and which Prisma models each module bundles together.
 *
 * `model` is the exact camelCase accessor Prisma Client generates for the
 * model name (e.g. `AMCPlan` -> `aMCPlan`) — used as `(db as any)[model]`
 * by the generic generator in `generate.ts`.
 *
 * Deliberately excluded from every module (not meaningful "business data",
 * or security-sensitive): Session, OTP, EmailCode, SMSLog. `User.passwordHash`
 * is stripped via `excludeFields` wherever User rows are exported.
 *
 * Backups export every row (including soft-deleted ones where a model has
 * `deletedAt`) — a backup/migration snapshot should reflect true historical
 * state, not just "currently active" rows like the existing admin CSV
 * exports do.
 */

export interface BackupTable {
  key: string;
  label: string;
  model: string;
  excludeFields?: string[];
}

export interface BackupModule {
  key: string;
  label: string;
  description: string;
  tables: BackupTable[];
}

export const BACKUP_MODULES: BackupModule[] = [
  {
    key: "equipment-services",
    label: "Equipment & Services",
    description: "Equipment records, service/part catalog, warehouse stock, and AMC (legacy + new flow).",
    tables: [
      { key: "equipment", label: "Equipment", model: "equipment" },
      { key: "category", label: "Categories", model: "category" },
      { key: "subCategory", label: "Subcategories", model: "subCategory" },
      { key: "serviceItem", label: "Service Items", model: "serviceItem" },
      { key: "partItem", label: "Part Items", model: "partItem" },
      { key: "amcPlan", label: "AMC Plans (Legacy)", model: "aMCPlan" },
      { key: "amcSubscription", label: "AMC Subscriptions (Legacy)", model: "aMCSubscription" },
      { key: "amcServiceUse", label: "AMC Service Uses (Legacy)", model: "aMCServiceUse" },
      { key: "amcRequest", label: "AMC Requests", model: "aMCRequest" },
      { key: "amcSiteSurvey", label: "AMC Site Surveys", model: "aMCSiteSurvey" },
      { key: "amcProposal", label: "AMC Proposals", model: "aMCProposal" },
      { key: "amcContract", label: "AMC Contracts", model: "aMCContract" },
      { key: "amcScheduledVisit", label: "AMC Scheduled Visits", model: "aMCScheduledVisit" },
      { key: "amcBreakdownRequest", label: "AMC Breakdown Requests", model: "aMCBreakdownRequest" },
      { key: "amcPayment", label: "AMC Payments", model: "aMCPayment" },
      { key: "warehouseInventory", label: "Warehouse Inventory", model: "warehouseInventory" },
      { key: "stockMovement", label: "Stock Movements", model: "stockMovement" },
      { key: "partRequest", label: "Part Requests", model: "partRequest" },
    ],
  },
  {
    key: "owner-customer",
    label: "Owner / Customer Management",
    description: "Owner profiles, restaurants, restaurant membership, and related requests.",
    tables: [
      { key: "ownerProfile", label: "Owner Profiles", model: "ownerProfile" },
      { key: "restaurant", label: "Restaurants", model: "restaurant" },
      { key: "restaurantMember", label: "Restaurant Members", model: "restaurantMember" },
      { key: "restaurantCategory", label: "Restaurant Categories", model: "restaurantCategory" },
      { key: "categoryRequest", label: "Category Requests", model: "categoryRequest" },
      { key: "restaurantDeletionRequest", label: "Restaurant Deletion Requests", model: "restaurantDeletionRequest" },
    ],
  },
  {
    key: "bookings-orders",
    label: "Bookings & Orders",
    description: "Service bookings and marketplace orders, carts, payments, and offers.",
    tables: [
      { key: "serviceBooking", label: "Service Bookings", model: "serviceBooking" },
      { key: "serviceBookingItem", label: "Service Booking Items", model: "serviceBookingItem" },
      { key: "paymentProof", label: "Payment Proofs", model: "paymentProof" },
      { key: "cart", label: "Carts", model: "cart" },
      { key: "cartItem", label: "Cart Items", model: "cartItem" },
      { key: "marketplaceOrder", label: "Marketplace Orders", model: "marketplaceOrder" },
      { key: "marketplaceOrderItem", label: "Marketplace Order Items", model: "marketplaceOrderItem" },
      { key: "marketplacePayment", label: "Marketplace Payments", model: "marketplacePayment" },
      { key: "marketplaceCart", label: "Marketplace Carts", model: "marketplaceCart" },
      { key: "marketplaceCartItem", label: "Marketplace Cart Items", model: "marketplaceCartItem" },
      { key: "orderStatusHistory", label: "Order Status History", model: "orderStatusHistory" },
      { key: "bookingOffer", label: "Booking Offers", model: "bookingOffer" },
      { key: "bookingOfferRedemption", label: "Booking Offer Redemptions", model: "bookingOfferRedemption" },
      { key: "priceUnlockRequest", label: "Price Unlock Requests", model: "priceUnlockRequest" },
    ],
  },
  {
    key: "service-management",
    label: "Service Management",
    description: "Engineer profiles, job assignments, work logs, payouts, and ratings.",
    tables: [
      { key: "engineerProfile", label: "Engineer Profiles", model: "engineerProfile" },
      { key: "engineerAssignment", label: "Engineer Assignments", model: "engineerAssignment" },
      { key: "engineerWorkLog", label: "Engineer Work Logs", model: "engineerWorkLog" },
      { key: "jobPartUsed", label: "Job Parts Used", model: "jobPartUsed" },
      { key: "payout", label: "Payouts", model: "payout" },
      { key: "salaryPayout", label: "Salary Payouts", model: "salaryPayout" },
      { key: "engineerRating", label: "Engineer Ratings", model: "engineerRating" },
      { key: "engineerStats", label: "Engineer Stats", model: "engineerStats" },
      { key: "supportTicket", label: "Support Tickets", model: "supportTicket" },
      { key: "supportTicketThread", label: "Support Ticket Threads", model: "supportTicketThread" },
    ],
  },
  {
    key: "salesman-management",
    label: "Salesman Management",
    description: "Salesman profiles, inquiries, visits, follow-ups, and the company master list.",
    tables: [
      { key: "salesmanProfile", label: "Salesman Profiles", model: "salesmanProfile" },
      { key: "launchPadInquiry", label: "Inquiries", model: "launchPadInquiry" },
      { key: "launchPadInquiryThread", label: "Inquiry Threads", model: "launchPadInquiryThread" },
      { key: "launchPadActivityLog", label: "Inquiry Activity Log", model: "launchPadActivityLog" },
      { key: "salesmanVisit", label: "Visits", model: "salesmanVisit" },
      { key: "salesmanFollowUp", label: "Follow-Ups", model: "salesmanFollowUp" },
      { key: "company", label: "Companies", model: "company" },
      { key: "companyContact", label: "Company Contacts", model: "companyContact" },
    ],
  },
  {
    key: "marketplace-vendors",
    label: "Marketplace & Vendors",
    description: "Marketplace catalog, vendor listings, vendor profiles, ratings, and commissions.",
    tables: [
      { key: "marketplaceCategory", label: "Marketplace Categories", model: "marketplaceCategory" },
      { key: "marketplaceSubCategory", label: "Marketplace Subcategories", model: "marketplaceSubCategory" },
      { key: "marketplaceProduct", label: "Marketplace Products", model: "marketplaceProduct" },
      { key: "vendorProduct", label: "Vendor Products", model: "vendorProduct" },
      { key: "vendorProfile", label: "Vendor Profiles", model: "vendorProfile" },
      { key: "vendorCoverage", label: "Vendor Coverage", model: "vendorCoverage" },
      { key: "vendorCategorySelection", label: "Vendor Category Selections", model: "vendorCategorySelection" },
      { key: "vendorRating", label: "Vendor Ratings", model: "vendorRating" },
      { key: "vendorStats", label: "Vendor Stats", model: "vendorStats" },
      { key: "vendorCommission", label: "Vendor Commissions", model: "vendorCommission" },
      { key: "vendorCommissionCollection", label: "Vendor Commission Collections", model: "vendorCommissionCollection" },
      { key: "vendorSubscriptionRequest", label: "Vendor Subscription Requests", model: "vendorSubscriptionRequest" },
      { key: "vendorLocationRequest", label: "Vendor Location Requests", model: "vendorLocationRequest" },
      { key: "recentlyViewedProduct", label: "Recently Viewed Products", model: "recentlyViewedProduct" },
    ],
  },
  {
    key: "finance-expenses",
    label: "Finance & Expenses",
    description: "Restaurant expenses, internal cashbook/ledger, staff, and external Khatabook sync data.",
    tables: [
      { key: "expense", label: "Expenses", model: "expense" },
      { key: "cashbookEntry", label: "Cashbook Entries", model: "cashbookEntry" },
      { key: "vendorLedger", label: "Vendor Ledger", model: "vendorLedger" },
      { key: "staff", label: "Staff", model: "staff" },
      { key: "staffAttendance", label: "Staff Attendance", model: "staffAttendance" },
      { key: "staffSalary", label: "Staff Salary", model: "staffSalary" },
      { key: "khatabookConnection", label: "Khatabook Connections", model: "khatabookConnection" },
      { key: "khatabookTransaction", label: "Khatabook Transactions", model: "khatabookTransaction" },
      { key: "khatabookSyncLog", label: "Khatabook Sync Log", model: "khatabookSyncLog" },
    ],
  },
  {
    key: "recruitment-careers",
    label: "Recruitment & Careers",
    description: "Technician recruitment CRM, training records, and the careers job board.",
    tables: [
      { key: "candidate", label: "Candidates", model: "candidate" },
      { key: "candidateNote", label: "Candidate Notes", model: "candidateNote" },
      { key: "candidateActivityLog", label: "Candidate Activity Log", model: "candidateActivityLog" },
      { key: "recruitmentPayment", label: "Recruitment Payments", model: "recruitmentPayment" },
      { key: "trainingProgram", label: "Training Programs", model: "trainingProgram" },
      { key: "trainingAttendance", label: "Training Attendance", model: "trainingAttendance" },
      { key: "jobPosition", label: "Job Positions", model: "jobPosition" },
      { key: "jobApplication", label: "Job Applications", model: "jobApplication" },
    ],
  },
  {
    key: "admin-users",
    label: "Admin & User Management",
    description: "All user accounts (every role), audit log, service location hierarchy, and platform settings.",
    tables: [
      { key: "user", label: "Users", model: "user", excludeFields: ["passwordHash"] },
      { key: "auditLog", label: "Audit Log", model: "auditLog" },
      { key: "serviceState", label: "Service States", model: "serviceState" },
      { key: "serviceCity", label: "Service Cities", model: "serviceCity" },
      { key: "serviceArea", label: "Service Areas", model: "serviceArea" },
      { key: "paymentSettings", label: "Payment Settings", model: "paymentSettings" },
      { key: "smsTemplate", label: "SMS Templates", model: "sMSTemplate" },
      { key: "contactInquiry", label: "Contact Inquiries", model: "contactInquiry" },
    ],
  },
  {
    key: "content-notifications",
    label: "Content & Notifications",
    description: "Mobile app content (feed/guides/sponsored) and the notification system.",
    tables: [
      { key: "feed", label: "Feed", model: "feed" },
      { key: "guide", label: "Guides", model: "guide" },
      { key: "sponsoredContent", label: "Sponsored Content", model: "sponsoredContent" },
      { key: "notification", label: "Notifications", model: "notification" },
      { key: "notificationPreference", label: "Notification Preferences", model: "notificationPreference" },
      { key: "deviceToken", label: "Device Tokens", model: "deviceToken" },
      { key: "pushNotificationLog", label: "Push Notification Log", model: "pushNotificationLog" },
    ],
  },
];

export function getBackupModule(moduleKey: string): BackupModule | undefined {
  return BACKUP_MODULES.find((m) => m.key === moduleKey);
}

export function getBackupTable(moduleKey: string, tableKey: string): BackupTable | undefined {
  return getBackupModule(moduleKey)?.tables.find((t) => t.key === tableKey);
}
