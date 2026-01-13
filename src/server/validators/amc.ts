import { z } from "zod";

// AMC Plan Validation
export const amcPlanSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  duration: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  price: z.number().int().positive("Price must be a positive number"),
  serviceLimit: z.number().int().positive("Service limit must be a positive number"),
  featuresJson: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const amcPlanUpdateSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").optional(),
  description: z.string().optional(),
  duration: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]).optional(),
  price: z.number().int().positive("Price must be a positive number").optional(),
  serviceLimit: z.number().int().positive("Service limit must be a positive number").optional(),
  featuresJson: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// AMC Subscription Validation (Equipment-Centric)
export const amcSubscriptionSchema = z.object({
  equipmentId: z.string().min(1, "Equipment is required"),
  planId: z.string().optional(), // Optional: use admin template plan
  // Custom Plan Fields (required if planId not provided)
  planName: z.string().min(3, "Plan name must be at least 3 characters").optional(),
  planDescription: z.string().optional(),
  duration: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  serviceLimit: z.number().int().positive("Service limit must be a positive number"),
  featuresJson: z.array(z.string()).optional(),
  totalAmount: z.number().int().min(0, "Amount must be non-negative"), // in paise
  startDate: z.string().datetime("Invalid date format"),
  autoRenew: z.boolean().optional(),
});

export const amcSubscriptionUpdateSchema = z.object({
  autoRenew: z.boolean().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
  servicesUsed: z.number().int().min(0).optional(),
});

// AMC Service Use Validation
export const amcServiceUseSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription is required"),
  bookingId: z.string().optional(),
  serviceDate: z.string().datetime("Invalid date format"),
  serviceType: z.string().min(2, "Service type must be at least 2 characters"),
  notes: z.string().optional(),
});

export type AMCPlanInput = z.infer<typeof amcPlanSchema>;
export type AMCPlanUpdateInput = z.infer<typeof amcPlanUpdateSchema>;
export type AMCSubscriptionInput = z.infer<typeof amcSubscriptionSchema>;
export type AMCSubscriptionUpdateInput = z.infer<typeof amcSubscriptionUpdateSchema>;
export type AMCServiceUseInput = z.infer<typeof amcServiceUseSchema>;
