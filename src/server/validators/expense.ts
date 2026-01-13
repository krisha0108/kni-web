import { z } from "zod";

// Expense Validation
export const expenseSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant is required"),
  category: z.enum(["FOOD", "UTILITIES", "SALARIES", "MAINTENANCE", "RENT", "SUPPLIES", "MARKETING", "TRANSPORT", "OTHER"]),
  amount: z.number().positive("Amount must be positive"),
  expenseDate: z.string().datetime("Invalid date format"),
  description: z.string().min(2, "Description must be at least 2 characters"),
  receiptImageUrl: z.string().url("Invalid URL").optional(),
});

export const expenseUpdateSchema = z.object({
  category: z
    .enum(["FOOD", "UTILITIES", "SALARIES", "MAINTENANCE", "RENT", "SUPPLIES", "MARKETING", "TRANSPORT", "OTHER"])
    .optional(),
  amount: z.number().positive("Amount must be positive").optional(),
  expenseDate: z.string().datetime("Invalid date format").optional(),
  description: z.string().min(2, "Description must be at least 2 characters").optional(),
  receiptImageUrl: z.string().url("Invalid URL").optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
