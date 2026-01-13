-- AlterTable
ALTER TABLE `marketplaceorder` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `notification` ADD COLUMN `type` ENUM('BOOKING', 'PAYMENT', 'ORDER', 'AMC', 'EQUIPMENT', 'SYSTEM', 'ANNOUNCEMENT') NOT NULL DEFAULT 'SYSTEM';

-- CreateIndex
CREATE INDEX `Notification_type_idx` ON `Notification`(`type`);
