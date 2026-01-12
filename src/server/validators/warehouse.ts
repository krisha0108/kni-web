import { z } from "zod";

// Warehouse Inventory Validation
export const warehouseInventorySchema = z.object({
  partItemId: z.string().min(1, "Part item is required"),
  currentStock: z.number().int().min(0, "Stock cannot be negative").optional(),
  lowStockThreshold: z.number().int().min(0, "Threshold cannot be negative").optional(),
});

export const warehouseInventoryUpdateSchema = z.object({
  lowStockThreshold: z.number().int().min(0, "Threshold cannot be negative"),
});

// Stock Movement Validation
export const stockMovementSchema = z.object({
  inventoryId: z.string().min(1, "Inventory is required"),
  movementType: z.enum(
    ["INWARD_PURCHASE", "INWARD_RETURN", "OUTWARD_USAGE", "OUTWARD_WASTAGE", "ADJUSTMENT"],
    {
      errorMap: () => ({ message: "Invalid movement type" }),
    }
  ),
  quantity: z.number().int().positive("Quantity must be positive"),
  bookingId: z.string().optional(),
  notes: z.string().optional(),
});

export type WarehouseInventoryInput = z.infer<typeof warehouseInventorySchema>;
export type WarehouseInventoryUpdateInput = z.infer<typeof warehouseInventoryUpdateSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;
