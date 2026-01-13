import { MarketplaceOrderStatus } from "@prisma/client";

export function getOrderStatusColor(
  status: MarketplaceOrderStatus
): "default" | "secondary" | "destructive" | "outline" {
  const colors: Record<
    MarketplaceOrderStatus,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    PLACED: "secondary",
    CONFIRMED: "default",
    PROCESSING: "default",
    SHIPPED: "outline",
    DELIVERED: "default",
    CANCELLED: "destructive",
  };
  return colors[status] || "secondary";
}

export function getOrderStatusLabel(status: MarketplaceOrderStatus): string {
  const labels: Record<MarketplaceOrderStatus, string> = {
    PLACED: "Placed",
    CONFIRMED: "Confirmed",
    PROCESSING: "Processing",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };
  return labels[status] || status;
}

export function getNextStatuses(
  currentStatus: MarketplaceOrderStatus
): MarketplaceOrderStatus[] {
  const validTransitions: Record<
    MarketplaceOrderStatus,
    MarketplaceOrderStatus[]
  > = {
    PLACED: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED", "CANCELLED"],
    DELIVERED: [], // Terminal state
    CANCELLED: [], // Terminal state
  };
  return validTransitions[currentStatus] || [];
}

export function canUpdateStatus(currentStatus: MarketplaceOrderStatus): boolean {
  return currentStatus !== "DELIVERED" && currentStatus !== "CANCELLED";
}
