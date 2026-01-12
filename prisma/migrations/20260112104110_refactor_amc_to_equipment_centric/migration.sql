/*
  Warnings:

  - Added the required column `duration` to the `AMCSubscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `equipmentId` to the `AMCSubscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceLimit` to the `AMCSubscription` table without a default value. This is not possible if the table is not empty.

*/

-- Clear existing AMC data (breaking change - dev only)
DELETE FROM `AMCServiceUse`;
DELETE FROM `AMCSubscription`;

-- DropForeignKey
ALTER TABLE `AMCSubscription` DROP FOREIGN KEY `AMCSubscription_planId_fkey`;

-- AlterTable
ALTER TABLE `AMCSubscription` ADD COLUMN `duration` ENUM('MONTHLY', 'QUARTERLY', 'YEARLY') NOT NULL,
    ADD COLUMN `equipmentId` VARCHAR(191) NOT NULL,
    ADD COLUMN `featuresJson` JSON NULL,
    ADD COLUMN `planDescription` TEXT NULL,
    ADD COLUMN `planName` VARCHAR(191) NULL,
    ADD COLUMN `serviceLimit` INTEGER NOT NULL,
    MODIFY `planId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `AMCSubscription_equipmentId_idx` ON `AMCSubscription`(`equipmentId`);

-- AddForeignKey
ALTER TABLE `AMCSubscription` ADD CONSTRAINT `AMCSubscription_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AMCSubscription` ADD CONSTRAINT `AMCSubscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `AMCPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
