-- AlterTable
ALTER TABLE `engineerassignment` ADD COLUMN `rejectionReason` TEXT NULL;

-- AlterTable
ALTER TABLE `marketplaceorder` ADD COLUMN `cancellationReason` TEXT NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `paymentproof` ADD COLUMN `rejectionReason` TEXT NULL,
    MODIFY `adminNote` TEXT NULL;

-- AlterTable
ALTER TABLE `servicebooking` ADD COLUMN `cancellationReason` TEXT NULL;

-- AlterTable
ALTER TABLE `vendorprofile` ADD COLUMN `rejectionReason` TEXT NULL,
    MODIFY `approvalNote` TEXT NULL;

-- CreateTable
CREATE TABLE `JobPartUsed` (
    `id` VARCHAR(191) NOT NULL,
    `workLogId` VARCHAR(191) NOT NULL,
    `partItemId` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL,
    `priceSnapshot` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `JobPartUsed_workLogId_idx`(`workLogId`),
    INDEX `JobPartUsed_partItemId_idx`(`partItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `JobPartUsed` ADD CONSTRAINT `JobPartUsed_workLogId_fkey` FOREIGN KEY (`workLogId`) REFERENCES `EngineerWorkLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobPartUsed` ADD CONSTRAINT `JobPartUsed_partItemId_fkey` FOREIGN KEY (`partItemId`) REFERENCES `PartItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
