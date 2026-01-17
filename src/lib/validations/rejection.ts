import { z } from 'zod';

/**
 * Shared validation schema for rejection reasons
 * Used across payment proofs, engineer assignments, bookings, orders, etc.
 */
export const rejectionReasonSchema = z
  .string()
  .min(10, 'Rejection reason must be at least 10 characters')
  .max(500, 'Rejection reason must not exceed 500 characters')
  .trim()
  .refine((val) => val.length >= 10, {
    message: 'Rejection reason cannot be empty or just whitespace',
  });

/**
 * Optional rejection reason (for updates where rejection may not be happening)
 */
export const optionalRejectionReasonSchema = rejectionReasonSchema.optional();

/**
 * Cancellation reason validation (same rules as rejection)
 */
export const cancellationReasonSchema = z
  .string()
  .min(10, 'Cancellation reason must be at least 10 characters')
  .max(500, 'Cancellation reason must not exceed 500 characters')
  .trim()
  .refine((val) => val.length >= 10, {
    message: 'Cancellation reason cannot be empty or just whitespace',
  });

/**
 * Optional cancellation reason
 */
export const optionalCancellationReasonSchema = cancellationReasonSchema.optional();

/**
 * Common rejection reason templates for quick selection
 */
export const REJECTION_REASON_TEMPLATES = {
  PAYMENT_PROOF: [
    'Payment proof image is unclear or unreadable',
    'Payment amount does not match booking total',
    'Payment proof appears to be manipulated or edited',
    'Wrong payment method used (not matching our UPI/account)',
    'Payment transaction is not recent or does not match booking date',
    'Insufficient payment information visible in screenshot',
  ],
  ENGINEER_ASSIGNMENT: [
    'Schedule conflict - already assigned to another job',
    'Location is too far from current service area',
    'Job requirements do not match my skill set',
    'Equipment type is not within my expertise',
    'Personal emergency - unable to take assignment',
  ],
  BOOKING_CANCELLATION: [
    'Issue resolved without service requirement',
    'Owner requested cancellation',
    'Equipment replaced/no longer needed',
    'Rescheduling to a later date',
    'Service no longer required',
    'Found alternative solution',
  ],
  ORDER_CANCELLATION: [
    'Vendor unable to fulfill order',
    'Items out of stock',
    'Delivery timeline too long',
    'Restaurant owner requested cancellation',
    'Incorrect items ordered - need to reorder',
    'Payment issues',
  ],
  VENDOR_REJECTION: [
    'Incomplete business documentation',
    'GST verification failed',
    'Business address not verifiable',
    'Duplicate vendor registration',
    'Does not meet service quality standards',
    'Coverage area already well-served',
  ],
  RESTAURANT_REJECTION: [
    'FSSAI certificate not valid',
    'Business address not verifiable',
    'Duplicate restaurant registration',
    'Incomplete registration information',
    'Does not meet service area requirements',
  ],
} as const;

/**
 * Type for rejection reason templates
 */
export type RejectionReasonTemplateCategory = keyof typeof REJECTION_REASON_TEMPLATES;

/**
 * Helper function to validate rejection reason
 */
export function validateRejectionReason(reason: string): {
  isValid: boolean;
  error?: string;
} {
  const result = rejectionReasonSchema.safeParse(reason);
  return {
    isValid: result.success,
    error: result.success ? undefined : result.error.issues[0]?.message,
  };
}

/**
 * Helper function to validate cancellation reason
 */
export function validateCancellationReason(reason: string): {
  isValid: boolean;
  error?: string;
} {
  const result = cancellationReasonSchema.safeParse(reason);
  return {
    isValid: result.success,
    error: result.success ? undefined : result.error.issues[0]?.message,
  };
}
