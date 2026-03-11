import { z } from "zod";

// Team Member Invitation Validation
export const inviteMemberSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  role: z.enum(["MANAGER", "ACCOUNTANT", "VIEWER"]),
});

// Team Member Role Update Validation
export const updateRoleSchema = z.object({
  role: z.enum(["MANAGER", "ACCOUNTANT", "VIEWER"]),
});

// Accept Invitation Validation
export const acceptInviteSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
  tempPassword: z.string().min(1, "Temporary password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
