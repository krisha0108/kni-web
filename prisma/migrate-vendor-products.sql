-- Migration script to convert existing VendorProducts to new MarketplaceProduct structure
-- Run this BEFORE prisma db push

-- Step 1: Add productId column as nullable first
ALTER TABLE `VendorProduct` ADD COLUMN `productId` VARCHAR(191) NULL;
ALTER TABLE `VendorProduct` ADD COLUMN `deliveryTime` VARCHAR(191) NULL;

-- Step 2: Create MarketplaceProducts from existing unique VendorProducts
-- Using the first admin user as creator (you may need to adjust the admin user ID)
INSERT INTO `MarketplaceProduct` (`id`, `name`, `imageUrl`, `categoryId`, `unit`, `description`, `isActive`, `createdBy`, `createdAt`, `updatedAt`)
SELECT
    CONCAT('mp_', SUBSTRING(MD5(CONCAT(vp.name, NOW())), 1, 20)) as id,
    vp.name,
    vp.imageUrl,
    vp.categoryId,
    vp.unit,
    vp.description,
    1 as isActive,
    (SELECT id FROM `User` WHERE role = 'ADMIN' LIMIT 1) as createdBy,
    NOW() as createdAt,
    NOW() as updatedAt
FROM (
    SELECT DISTINCT name, imageUrl, categoryId, unit, description
    FROM `VendorProduct`
    WHERE deletedAt IS NULL
) vp;

-- Step 3: Update VendorProducts to reference the new MarketplaceProducts
UPDATE `VendorProduct` vp
JOIN `MarketplaceProduct` mp ON vp.name = mp.name
SET vp.productId = mp.id
WHERE vp.deletedAt IS NULL;

-- Step 4: For any remaining VendorProducts without productId, we need to handle them
-- This shows which ones need manual attention
SELECT id, name, vendorId FROM `VendorProduct` WHERE productId IS NULL AND deletedAt IS NULL;

-- Step 5: After verifying all VendorProducts have productId, make the column required
-- ALTER TABLE `VendorProduct` MODIFY COLUMN `productId` VARCHAR(191) NOT NULL;

-- Step 6: Add foreign key constraint
-- ALTER TABLE `VendorProduct` ADD CONSTRAINT `VendorProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `MarketplaceProduct`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Add unique constraint for vendor+product combination
-- ALTER TABLE `VendorProduct` ADD UNIQUE INDEX `VendorProduct_vendorId_productId_key`(`vendorId`, `productId`);

-- Step 8: Drop old columns that are now in MarketplaceProduct
-- ALTER TABLE `VendorProduct` DROP COLUMN `name`;
-- ALTER TABLE `VendorProduct` DROP COLUMN `imageUrl`;
-- ALTER TABLE `VendorProduct` DROP COLUMN `categoryId`;
-- ALTER TABLE `VendorProduct` DROP COLUMN `unit`;
