export type StockMovementType =
  | "INWARD_PURCHASE"
  | "INWARD_RETURN"
  | "OUTWARD_USAGE"
  | "OUTWARD_WASTAGE"
  | "ADJUSTMENT";

export type StockStatus = "CRITICAL" | "LOW" | "NORMAL" | "OUT_OF_STOCK";

/**
 * Calculate new stock balance after a movement
 */
export function calculateNewBalance(
  currentStock: number,
  movementType: StockMovementType,
  quantity: number
): number {
  const isInward = movementType === "INWARD_PURCHASE" || movementType === "INWARD_RETURN";
  const isOutward = movementType === "OUTWARD_USAGE" || movementType === "OUTWARD_WASTAGE";

  if (isInward) {
    return currentStock + quantity;
  } else if (isOutward) {
    return Math.max(0, currentStock - quantity);
  } else {
    // ADJUSTMENT can be positive or negative
    return Math.max(0, currentStock + quantity);
  }
}

/**
 * Get stock status based on current stock and threshold
 */
export function getStockStatus(
  currentStock: number,
  lowStockThreshold: number
): {
  status: StockStatus;
  color: "destructive" | "warning" | "success" | "secondary";
  label: string;
} {
  if (currentStock === 0) {
    return {
      status: "OUT_OF_STOCK",
      color: "destructive",
      label: "Out of Stock",
    };
  } else if (currentStock < lowStockThreshold / 2) {
    return {
      status: "CRITICAL",
      color: "destructive",
      label: "Critical",
    };
  } else if (currentStock < lowStockThreshold) {
    return {
      status: "LOW",
      color: "warning",
      label: "Low Stock",
    };
  } else {
    return {
      status: "NORMAL",
      color: "success",
      label: "Normal",
    };
  }
}

/**
 * Get movement type label
 */
export function getMovementTypeLabel(movementType: StockMovementType): string {
  switch (movementType) {
    case "INWARD_PURCHASE":
      return "Inward - Purchase";
    case "INWARD_RETURN":
      return "Inward - Return";
    case "OUTWARD_USAGE":
      return "Outward - Usage";
    case "OUTWARD_WASTAGE":
      return "Outward - Wastage";
    case "ADJUSTMENT":
      return "Adjustment";
    default:
      return movementType;
  }
}

/**
 * Get movement type color
 */
export function getMovementTypeColor(
  movementType: StockMovementType
): "default" | "success" | "destructive" | "warning" {
  switch (movementType) {
    case "INWARD_PURCHASE":
    case "INWARD_RETURN":
      return "success";
    case "OUTWARD_USAGE":
      return "default";
    case "OUTWARD_WASTAGE":
      return "destructive";
    case "ADJUSTMENT":
      return "warning";
    default:
      return "default";
  }
}

/**
 * Check if stock is low
 */
export function isLowStock(currentStock: number, lowStockThreshold: number): boolean {
  return currentStock < lowStockThreshold;
}

/**
 * Check if stock is critical (below half of threshold)
 */
export function isCriticalStock(currentStock: number, lowStockThreshold: number): boolean {
  return currentStock < lowStockThreshold / 2;
}

/**
 * Check if movement type is inward (adds stock)
 */
export function isInwardMovement(movementType: StockMovementType): boolean {
  return movementType === "INWARD_PURCHASE" || movementType === "INWARD_RETURN";
}

/**
 * Check if movement type is outward (removes stock)
 */
export function isOutwardMovement(movementType: StockMovementType): boolean {
  return movementType === "OUTWARD_USAGE" || movementType === "OUTWARD_WASTAGE";
}

/**
 * Calculate stock value
 */
export function calculateStockValue(quantity: number, pricePerUnit: number): number {
  return quantity * pricePerUnit;
}

/**
 * Get stock percentage relative to threshold
 */
export function getStockPercentage(currentStock: number, lowStockThreshold: number): number {
  if (lowStockThreshold === 0) return 100;
  return Math.round((currentStock / (lowStockThreshold * 2)) * 100);
}
