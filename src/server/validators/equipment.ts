import { z } from "zod";

// Helper to validate URLs or relative paths
const urlOrPath = z.string().refine(
  (val) => val === "" || val.startsWith("/") || val.startsWith("http://") || val.startsWith("https://"),
  { message: "Must be a valid URL or path" }
);

export const equipmentSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  categoryId: z.string().min(1, "Category is required"),
  subCategoryId: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  purchaseDate: z.string().datetime("Invalid date format"),
  warrantyEndDate: z.string().datetime("Invalid date format").nullable().optional(),
  serialNumber: z.string().nullable().optional(),
  installLocation: z.string().nullable().optional(),
  billImageUrl: urlOrPath.nullable().optional(),
  warrantyCardUrl: urlOrPath.nullable().optional(),
  photoUrls: z.array(urlOrPath).max(5, "Maximum 5 photos allowed").nullable().optional(),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE", "RETIRED"]).optional(),
  notes: z.string().nullable().optional(),
});

export const equipmentUpdateSchema = equipmentSchema.partial();

export type EquipmentInput = z.infer<typeof equipmentSchema>;
export type EquipmentUpdateInput = z.infer<typeof equipmentUpdateSchema>;
