-- AlterTable
ALTER TABLE `restaurant` ADD COLUMN `pincode` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `VendorCoverage` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `coverageType` ENUM('CITY_WIDE', 'PINCODE_WISE') NOT NULL,
    `cities` JSON NULL,
    `pincodes` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VendorCoverage_vendorId_key`(`vendorId`),
    INDEX `VendorCoverage_vendorId_idx`(`vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RestaurantMember` (
    `id` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'MANAGER', 'ACCOUNTANT', 'VIEWER') NOT NULL,
    `invitedBy` VARCHAR(191) NOT NULL,
    `inviteToken` VARCHAR(191) NULL,
    `inviteExpiresAt` DATETIME(3) NULL,
    `invitedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acceptedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RestaurantMember_inviteToken_key`(`inviteToken`),
    INDEX `RestaurantMember_restaurantId_idx`(`restaurantId`),
    INDEX `RestaurantMember_userId_idx`(`userId`),
    INDEX `RestaurantMember_invitedBy_idx`(`invitedBy`),
    INDEX `RestaurantMember_inviteToken_idx`(`inviteToken`),
    UNIQUE INDEX `RestaurantMember_restaurantId_userId_key`(`restaurantId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VendorCoverage` ADD CONSTRAINT `VendorCoverage_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RestaurantMember` ADD CONSTRAINT `RestaurantMember_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RestaurantMember` ADD CONSTRAINT `RestaurantMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RestaurantMember` ADD CONSTRAINT `RestaurantMember_invitedBy_fkey` FOREIGN KEY (`invitedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
