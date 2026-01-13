-- AlterTable
ALTER TABLE `marketplaceorder` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- CreateTable
CREATE TABLE `KhatabookConnection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `businessName` VARCHAR(191) NOT NULL,
    `accessToken` TEXT NOT NULL,
    `refreshToken` TEXT NULL,
    `tokenExpiresAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `autoSync` BOOLEAN NOT NULL DEFAULT true,
    `lastSyncAt` DATETIME(3) NULL,
    `syncError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KhatabookConnection_userId_key`(`userId`),
    INDEX `KhatabookConnection_userId_idx`(`userId`),
    INDEX `KhatabookConnection_restaurantId_idx`(`restaurantId`),
    INDEX `KhatabookConnection_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KhatabookTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `connectionId` VARCHAR(191) NOT NULL,
    `transactionType` ENUM('BOOKING_REVENUE', 'MARKETPLACE_ORDER', 'EXPENSE', 'ENGINEER_PAYOUT', 'AMC_REVENUE') NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `khatabookId` VARCHAR(191) NULL,
    `amount` INTEGER NOT NULL,
    `description` TEXT NOT NULL,
    `customerName` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL,
    `syncStatus` ENUM('PENDING', 'SYNCED', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `syncAttempts` INTEGER NOT NULL DEFAULT 0,
    `lastSyncAt` DATETIME(3) NULL,
    `syncError` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KhatabookTransaction_connectionId_idx`(`connectionId`),
    INDEX `KhatabookTransaction_syncStatus_idx`(`syncStatus`),
    INDEX `KhatabookTransaction_transactionType_idx`(`transactionType`),
    INDEX `KhatabookTransaction_date_idx`(`date`),
    INDEX `KhatabookTransaction_khatabookId_idx`(`khatabookId`),
    UNIQUE INDEX `KhatabookTransaction_entityType_entityId_key`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KhatabookSyncLog` (
    `id` VARCHAR(191) NOT NULL,
    `connectionId` VARCHAR(191) NOT NULL,
    `syncType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `itemsSynced` INTEGER NOT NULL DEFAULT 0,
    `itemsFailed` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` TEXT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `duration` INTEGER NULL,

    INDEX `KhatabookSyncLog_connectionId_idx`(`connectionId`),
    INDEX `KhatabookSyncLog_status_idx`(`status`),
    INDEX `KhatabookSyncLog_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KhatabookTransaction` ADD CONSTRAINT `KhatabookTransaction_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `KhatabookConnection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
