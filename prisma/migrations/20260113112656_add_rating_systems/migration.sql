-- AlterTable
ALTER TABLE `marketplaceorder` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- CreateTable
CREATE TABLE `VendorRating` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `overallRating` INTEGER NOT NULL,
    `productQuality` INTEGER NULL,
    `deliveryTime` INTEGER NULL,
    `customerService` INTEGER NULL,
    `valueForMoney` INTEGER NULL,
    `packaging` INTEGER NULL,
    `review` TEXT NULL,
    `images` JSON NULL,
    `isVerifiedPurchase` BOOLEAN NOT NULL DEFAULT true,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `adminResponse` TEXT NULL,
    `respondedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VendorRating_orderId_key`(`orderId`),
    INDEX `VendorRating_vendorId_idx`(`vendorId`),
    INDEX `VendorRating_ownerId_idx`(`ownerId`),
    INDEX `VendorRating_restaurantId_idx`(`restaurantId`),
    INDEX `VendorRating_overallRating_idx`(`overallRating`),
    INDEX `VendorRating_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EngineerRating` (
    `id` VARCHAR(191) NOT NULL,
    `assignmentId` VARCHAR(191) NOT NULL,
    `engineerId` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `overallRating` INTEGER NOT NULL,
    `professionalism` INTEGER NULL,
    `technicalSkill` INTEGER NULL,
    `communication` INTEGER NULL,
    `punctuality` INTEGER NULL,
    `problemSolving` INTEGER NULL,
    `review` TEXT NULL,
    `images` JSON NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `adminResponse` TEXT NULL,
    `respondedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EngineerRating_assignmentId_key`(`assignmentId`),
    INDEX `EngineerRating_engineerId_idx`(`engineerId`),
    INDEX `EngineerRating_ownerId_idx`(`ownerId`),
    INDEX `EngineerRating_restaurantId_idx`(`restaurantId`),
    INDEX `EngineerRating_bookingId_idx`(`bookingId`),
    INDEX `EngineerRating_overallRating_idx`(`overallRating`),
    INDEX `EngineerRating_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VendorStats` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `averageRating` DOUBLE NOT NULL DEFAULT 0,
    `totalRatings` INTEGER NOT NULL DEFAULT 0,
    `fiveStarCount` INTEGER NOT NULL DEFAULT 0,
    `fourStarCount` INTEGER NOT NULL DEFAULT 0,
    `threeStarCount` INTEGER NOT NULL DEFAULT 0,
    `twoStarCount` INTEGER NOT NULL DEFAULT 0,
    `oneStarCount` INTEGER NOT NULL DEFAULT 0,
    `averageProductQuality` DOUBLE NULL,
    `averageDeliveryTime` DOUBLE NULL,
    `averageCustomerService` DOUBLE NULL,
    `averageValueForMoney` DOUBLE NULL,
    `averagePackaging` DOUBLE NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VendorStats_vendorId_key`(`vendorId`),
    INDEX `VendorStats_averageRating_idx`(`averageRating`),
    INDEX `VendorStats_totalRatings_idx`(`totalRatings`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EngineerStats` (
    `id` VARCHAR(191) NOT NULL,
    `engineerId` VARCHAR(191) NOT NULL,
    `averageRating` DOUBLE NOT NULL DEFAULT 0,
    `totalRatings` INTEGER NOT NULL DEFAULT 0,
    `fiveStarCount` INTEGER NOT NULL DEFAULT 0,
    `fourStarCount` INTEGER NOT NULL DEFAULT 0,
    `threeStarCount` INTEGER NOT NULL DEFAULT 0,
    `twoStarCount` INTEGER NOT NULL DEFAULT 0,
    `oneStarCount` INTEGER NOT NULL DEFAULT 0,
    `averageProfessionalism` DOUBLE NULL,
    `averageTechnicalSkill` DOUBLE NULL,
    `averageCommunication` DOUBLE NULL,
    `averagePunctuality` DOUBLE NULL,
    `averageProblemSolving` DOUBLE NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EngineerStats_engineerId_key`(`engineerId`),
    INDEX `EngineerStats_averageRating_idx`(`averageRating`),
    INDEX `EngineerStats_totalRatings_idx`(`totalRatings`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VendorRating` ADD CONSTRAINT `VendorRating_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `MarketplaceOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorRating` ADD CONSTRAINT `VendorRating_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorRating` ADD CONSTRAINT `VendorRating_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorRating` ADD CONSTRAINT `VendorRating_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EngineerRating` ADD CONSTRAINT `EngineerRating_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `EngineerAssignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EngineerRating` ADD CONSTRAINT `EngineerRating_engineerId_fkey` FOREIGN KEY (`engineerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EngineerRating` ADD CONSTRAINT `EngineerRating_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EngineerRating` ADD CONSTRAINT `EngineerRating_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EngineerRating` ADD CONSTRAINT `EngineerRating_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `ServiceBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorStats` ADD CONSTRAINT `VendorStats_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EngineerStats` ADD CONSTRAINT `EngineerStats_engineerId_fkey` FOREIGN KEY (`engineerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
