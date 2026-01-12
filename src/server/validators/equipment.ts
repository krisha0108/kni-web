import { z } from "zod";

// Helper to validate URLs or relative paths
const urlOrPath = z.string().refine(
  (val) => val === "" || val.startsWith("/") || val.startsWith("http://") || val.startsWith("https://"),
  { message: "Must be a valid URL or path" }
);

export const equipmentSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.string().min(2, "Category is required"),
  purchaseDate: z.string().datetime("Invalid date format"),
  warrantyEndDate: z.string().datetime("Invalid date format").optional(),
  serialNumber: z.string().optional(),
  billImageUrl: urlOrPath.optional(),
  warrantyCardUrl: urlOrPath.optional(),
  photoUrls: z.array(urlOrPath).max(5, "Maximum 5 photos allowed").optional(),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE", "RETIRED"]).optional(),
  notes: z.string().optional(),
});

export const equipmentUpdateSchema = equipmentSchema.partial();

export type EquipmentInput = z.infer<typeof equipmentSchema>;
export type EquipmentUpdateInput = z.infer<typeof equipmentUpdateSchema>;
