# Database Migration Required: Rejection Reasons

## Schema Changes Added

The following fields have been added to enforce mandatory rejection reasons:

### 1. PaymentProof
- Added: `rejectionReason String? @db.Text` (mandatory when status = REJECTED)
- Existing: `adminNote` kept for general notes

### 2. EngineerAssignment
- Added: `rejectionReason String? @db.Text` (mandatory when status = REJECTED)

### 3. ServiceBooking
- Added: `cancellationReason String? @db.Text` (mandatory when status = CANCELLED)

### 4. MarketplaceOrder
- Added: `cancellationReason String? @db.Text` (mandatory when status = CANCELLED)

### 5. VendorProfile
- Added: `rejectionReason String? @db.Text` (mandatory when approvalStatus = REJECTED)
- Existing: `approvalNote` kept for backward compatibility

## To Apply Migration

When database is available, run:

```bash
npx prisma migrate dev --name add_rejection_reasons
```

Or for production:

```bash
npx prisma migrate deploy
```

## SQL Changes (Manual Migration if needed)

```sql
-- Add rejection reason to PaymentProof
ALTER TABLE `PaymentProof`
  ADD COLUMN `rejectionReason` TEXT NULL,
  MODIFY COLUMN `adminNote` TEXT NULL;

-- Add rejection reason to EngineerAssignment
ALTER TABLE `EngineerAssignment`
  ADD COLUMN `rejectionReason` TEXT NULL;

-- Add cancellation reason to ServiceBooking
ALTER TABLE `ServiceBooking`
  ADD COLUMN `cancellationReason` TEXT NULL;

-- Add cancellation reason to MarketplaceOrder
ALTER TABLE `MarketplaceOrder`
  ADD COLUMN `cancellationReason` TEXT NULL;

-- Add rejection reason to VendorProfile
ALTER TABLE `VendorProfile`
  ADD COLUMN `rejectionReason` TEXT NULL,
  MODIFY COLUMN `approvalNote` TEXT NULL;
```

## Validation Rules

All rejection reason fields must be:
- Non-empty string when rejecting/cancelling
- Minimum 10 characters
- Maximum 500 characters
- Trimmed of whitespace
