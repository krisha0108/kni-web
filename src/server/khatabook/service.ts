import { db } from "@/server/db";
import {
  KhatabookSyncStatus,
  KhatabookTransactionType,
} from "@prisma/client";
import crypto from "crypto";

// Khatabook API Configuration
const KHATABOOK_CONFIG = {
  apiUrl: process.env.KHATABOOK_API_URL || "https://api.khatabook.com/v1",
  clientId: process.env.KHATABOOK_CLIENT_ID || "",
  clientSecret: process.env.KHATABOOK_CLIENT_SECRET || "",
  redirectUri: process.env.KHATABOOK_REDIRECT_URI || "",
  webhookSecret: process.env.KHATABOOK_WEBHOOK_SECRET || "",
  encryptionKey: process.env.KHATABOOK_ENCRYPTION_KEY || "default-encryption-key-32-chars",
};

// ========================================
// ENCRYPTION UTILITIES
// ========================================

/**
 * Encrypt sensitive data (tokens)
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(KHATABOOK_CONFIG.encryptionKey.padEnd(32, "0").slice(0, 32));
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt sensitive data (tokens)
 */
function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const key = Buffer.from(KHATABOOK_CONFIG.encryptionKey.padEnd(32, "0").slice(0, 32));
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ========================================
// KHATABOOK API CLIENT
// ========================================

interface KhatabookAPIOptions {
  method: string;
  endpoint: string;
  accessToken?: string;
  body?: any;
}

/**
 * Make authenticated API call to Khatabook
 */
async function khatabookAPICall(options: KhatabookAPIOptions): Promise<any> {
  const { method, endpoint, accessToken, body } = options;

  const headers: any = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${KHATABOOK_CONFIG.apiUrl}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Khatabook API error: ${response.status} - ${error.message || response.statusText}`
    );
  }

  return response.json();
}

// ========================================
// OAUTH FLOW
// ========================================

/**
 * Generate authorization URL for OAuth flow
 */
export function generateAuthorizationUrl(userId: string, restaurantId?: string): string {
  const state = Buffer.from(
    JSON.stringify({ userId, restaurantId, timestamp: Date.now() })
  ).toString("base64");

  const params = new URLSearchParams({
    client_id: KHATABOOK_CONFIG.clientId,
    redirect_uri: KHATABOOK_CONFIG.redirectUri,
    response_type: "code",
    scope: "businesses:read transactions:write transactions:read",
    state,
  });

  return `https://khatabook.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const response = await fetch("https://khatabook.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: KHATABOOK_CONFIG.clientId,
      client_secret: KHATABOOK_CONFIG.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: KHATABOOK_CONFIG.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange authorization code");
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const response = await fetch("https://khatabook.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: KHATABOOK_CONFIG.clientId,
      client_secret: KHATABOOK_CONFIG.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh access token");
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  };
}

// ========================================
// CONNECTION MANAGEMENT
// ========================================

export interface CreateConnectionInput {
  userId: string;
  restaurantId?: string;
  code: string;
}

/**
 * Create Khatabook connection after OAuth authorization
 */
export async function createKhatabookConnection(
  input: CreateConnectionInput
): Promise<string> {
  const { userId, restaurantId, code } = input;

  // Exchange code for tokens
  const { accessToken, refreshToken, expiresIn } = await exchangeCodeForToken(code);

  // Get business information from Khatabook
  const businesses = await khatabookAPICall({
    method: "GET",
    endpoint: "/businesses",
    accessToken,
  });

  if (!businesses || businesses.length === 0) {
    throw new Error("No Khatabook business found for this account");
  }

  // Use the first business (or let user select if multiple)
  const business = businesses[0];

  // Check if connection already exists
  const existingConnection = await db.khatabookConnection.findUnique({
    where: { userId },
  });

  if (existingConnection) {
    // Update existing connection
    const connection = await db.khatabookConnection.update({
      where: { userId },
      data: {
        restaurantId: restaurantId || null,
        businessId: business.id,
        businessName: business.name,
        accessToken: encrypt(accessToken),
        refreshToken: refreshToken ? encrypt(refreshToken) : null,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        isActive: true,
        syncError: null,
        updatedAt: new Date(),
      },
    });

    return connection.id;
  }

  // Create new connection
  const connection = await db.khatabookConnection.create({
    data: {
      userId,
      restaurantId: restaurantId || null,
      businessId: business.id,
      businessName: business.name,
      accessToken: encrypt(accessToken),
      refreshToken: refreshToken ? encrypt(refreshToken) : null,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      isActive: true,
      autoSync: true,
    },
  });

  return connection.id;
}

/**
 * Get valid access token (refresh if expired)
 */
export async function getValidAccessToken(connectionId: string): Promise<string> {
  const connection = await db.khatabookConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection || !connection.isActive) {
    throw new Error("Khatabook connection not found or inactive");
  }

  // Decrypt access token
  let accessToken = decrypt(connection.accessToken);

  // Check if token is expired or about to expire (within 5 minutes)
  const now = new Date();
  const expiresAt = connection.tokenExpiresAt;

  if (expiresAt && expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    // Token expired or expiring soon, refresh it
    if (!connection.refreshToken) {
      throw new Error("No refresh token available, re-authorization required");
    }

    const refreshToken = decrypt(connection.refreshToken);
    const {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    } = await refreshAccessToken(refreshToken);

    // Update connection with new tokens
    await db.khatabookConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: encrypt(newAccessToken),
        refreshToken: newRefreshToken ? encrypt(newRefreshToken) : connection.refreshToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });

    accessToken = newAccessToken;
  }

  return accessToken;
}

/**
 * Disconnect Khatabook integration
 */
export async function disconnectKhatabook(userId: string): Promise<void> {
  await db.khatabookConnection.updateMany({
    where: { userId },
    data: { isActive: false },
  });
}

// ========================================
// TRANSACTION SYNCING
// ========================================

export interface CreateTransactionInput {
  connectionId: string;
  transactionType: KhatabookTransactionType;
  entityType: string;
  entityId: string;
  amount: number;
  description: string;
  customerName?: string;
  date: Date;
  metadata?: any;
}

/**
 * Create a pending transaction for sync
 */
export async function createPendingTransaction(
  input: CreateTransactionInput
): Promise<string> {
  // Check if transaction already exists
  const existing = await db.khatabookTransaction.findUnique({
    where: {
      entityType_entityId: {
        entityType: input.entityType,
        entityId: input.entityId,
      },
    },
  });

  if (existing) {
    return existing.id;
  }

  // Create new transaction
  const transaction = await db.khatabookTransaction.create({
    data: {
      connectionId: input.connectionId,
      transactionType: input.transactionType,
      entityType: input.entityType,
      entityId: input.entityId,
      amount: input.amount,
      description: input.description,
      customerName: input.customerName || null,
      date: input.date,
      metadata: input.metadata || null,
      syncStatus: KhatabookSyncStatus.PENDING,
    },
  });

  return transaction.id;
}

/**
 * Sync a single transaction to Khatabook
 */
export async function syncTransactionToKhatabook(
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  const transaction = await db.khatabookTransaction.findUnique({
    where: { id: transactionId },
    include: { connection: true },
  });

  if (!transaction) {
    return { success: false, error: "Transaction not found" };
  }

  if (transaction.syncStatus === KhatabookSyncStatus.SYNCED) {
    return { success: true }; // Already synced
  }

  try {
    // Get valid access token
    const accessToken = await getValidAccessToken(transaction.connectionId);

    // Prepare transaction data for Khatabook API
    const khatabookData = {
      business_id: transaction.connection.businessId,
      type: transaction.amount > 0 ? "CREDIT" : "DEBIT", // Positive = revenue, Negative = expense
      amount: Math.abs(transaction.amount / 100), // Convert paise to rupees
      description: transaction.description,
      customer_name: transaction.customerName || "KNI Super App",
      date: transaction.date.toISOString().split("T")[0], // YYYY-MM-DD
      category: getKhatabookCategory(transaction.transactionType),
      metadata: {
        source: "KNI_SUPER_APP",
        entity_type: transaction.entityType,
        entity_id: transaction.entityId,
        ...(transaction.metadata || {}),
      },
    };

    // Send to Khatabook
    const response = await khatabookAPICall({
      method: "POST",
      endpoint: "/transactions",
      accessToken,
      body: khatabookData,
    });

    // Update transaction status
    await db.khatabookTransaction.update({
      where: { id: transactionId },
      data: {
        khatabookId: response.transaction_id || response.id,
        syncStatus: KhatabookSyncStatus.SYNCED,
        lastSyncAt: new Date(),
        syncError: null,
        syncAttempts: transaction.syncAttempts + 1,
      },
    });

    // Update connection last sync
    await db.khatabookConnection.update({
      where: { id: transaction.connectionId },
      data: { lastSyncAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Update transaction with error
    await db.khatabookTransaction.update({
      where: { id: transactionId },
      data: {
        syncStatus: KhatabookSyncStatus.FAILED,
        syncError: errorMessage,
        lastSyncAt: new Date(),
        syncAttempts: transaction.syncAttempts + 1,
      },
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Map transaction type to Khatabook category
 */
function getKhatabookCategory(type: KhatabookTransactionType): string {
  const categoryMap: Record<KhatabookTransactionType, string> = {
    BOOKING_REVENUE: "Service Income",
    MARKETPLACE_ORDER: "Product Sales",
    EXPENSE: "Business Expense",
    ENGINEER_PAYOUT: "Staff Payment",
    AMC_REVENUE: "Subscription Income",
  };

  return categoryMap[type] || "Other";
}

/**
 * Sync all pending transactions for a connection
 */
export async function syncAllPendingTransactions(
  connectionId: string
): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}> {
  const startTime = Date.now();

  // Get all pending transactions
  const pendingTransactions = await db.khatabookTransaction.findMany({
    where: {
      connectionId,
      syncStatus: KhatabookSyncStatus.PENDING,
    },
    orderBy: { date: "asc" },
  });

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  // Sync each transaction
  for (const transaction of pendingTransactions) {
    const result = await syncTransactionToKhatabook(transaction.id);
    if (result.success) {
      synced++;
    } else {
      failed++;
      if (result.error) {
        errors.push(`${transaction.entityType}:${transaction.entityId} - ${result.error}`);
      }
    }
  }

  // Create sync log
  const duration = Date.now() - startTime;
  await db.khatabookSyncLog.create({
    data: {
      connectionId,
      syncType: "MANUAL",
      status: failed === 0 ? "SUCCESS" : synced > 0 ? "PARTIAL" : "FAILED",
      itemsSynced: synced,
      itemsFailed: failed,
      errorMessage: errors.length > 0 ? errors.join("\n") : null,
      completedAt: new Date(),
      duration,
    },
  });

  return {
    success: failed === 0,
    synced,
    failed,
    errors,
  };
}

// ========================================
// AUTO-SYNC HELPERS
// ========================================

/**
 * Auto-create and sync transaction for booking
 */
export async function autoSyncBooking(bookingId: string): Promise<void> {
  // Get booking details
  const booking = await db.serviceBooking.findUnique({
    where: { id: bookingId },
    include: {
      owner: { select: { id: true, name: true } },
      restaurant: { select: { name: true } },
    },
  });

  if (!booking) return;

  // Check if user has active Khatabook connection with auto-sync enabled
  const connection = await db.khatabookConnection.findFirst({
    where: {
      userId: booking.ownerId,
      isActive: true,
      autoSync: true,
    },
  });

  if (!connection) return;

  // Create pending transaction
  const transactionId = await createPendingTransaction({
    connectionId: connection.id,
    transactionType: KhatabookTransactionType.BOOKING_REVENUE,
    entityType: "BOOKING",
    entityId: bookingId,
    amount: booking.totalAmount,
    description: `Service booking at ${booking.restaurant.name}`,
    customerName: booking.owner.name,
    date: booking.createdAt,
    metadata: {
      restaurantName: booking.restaurant.name,
      bookingStatus: booking.status,
    },
  });

  // Sync immediately
  await syncTransactionToKhatabook(transactionId);
}

/**
 * Auto-create and sync transaction for marketplace order
 */
export async function autoSyncMarketplaceOrder(orderId: string): Promise<void> {
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: {
      owner: { select: { id: true, name: true } },
      vendor: { select: { name: true } },
    },
  });

  if (!order) return;

  const connection = await db.khatabookConnection.findFirst({
    where: {
      userId: order.ownerId,
      isActive: true,
      autoSync: true,
    },
  });

  if (!connection) return;

  const transactionId = await createPendingTransaction({
    connectionId: connection.id,
    transactionType: KhatabookTransactionType.MARKETPLACE_ORDER,
    entityType: "ORDER",
    entityId: orderId,
    amount: order.totalAmount,
    description: `Purchase from ${order.vendor.name}`,
    customerName: order.owner.name,
    date: order.createdAt,
    metadata: {
      vendorName: order.vendor.name,
      orderStatus: order.status,
    },
  });

  await syncTransactionToKhatabook(transactionId);
}

/**
 * Auto-create and sync transaction for expense
 */
export async function autoSyncExpense(expenseId: string): Promise<void> {
  const expense = await db.expense.findUnique({
    where: { id: expenseId },
    include: {
      owner: { select: { id: true, name: true } },
      restaurant: { select: { name: true } },
    },
  });

  if (!expense) return;

  const connection = await db.khatabookConnection.findFirst({
    where: {
      userId: expense.ownerId,
      isActive: true,
      autoSync: true,
    },
  });

  if (!connection) return;

  const transactionId = await createPendingTransaction({
    connectionId: connection.id,
    transactionType: KhatabookTransactionType.EXPENSE,
    entityType: "EXPENSE",
    entityId: expenseId,
    amount: -expense.amount, // Negative for expense
    description: `${expense.category}: ${expense.description}`,
    customerName: expense.restaurant.name,
    date: expense.expenseDate,
    metadata: {
      category: expense.category,
      restaurantName: expense.restaurant.name,
    },
  });

  await syncTransactionToKhatabook(transactionId);
}
