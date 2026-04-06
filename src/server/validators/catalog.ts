import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export const subCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  categoryId: z.string().min(1, "Category is required"),
  imageUrl: z.string().nullable().optional(),
});

export const serviceItemSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().nullable().optional(),
  price: z.number().int().positive("Price must be a positive integer"),
  categoryId: z.string().min(1, "Category is required"),
  subCategoryId: z.string().nullable().optional(),
});

export const partItemSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  price: z.number().int().positive("Price must be a positive integer"),
  categoryId: z.string().min(1, "Category is required"),
  subCategoryId: z.string().nullable().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type SubCategoryInput = z.infer<typeof subCategorySchema>;
export type ServiceItemInput = z.infer<typeof serviceItemSchema>;
export type PartItemInput = z.infer<typeof partItemSchema>;
