-- AlterTable
ALTER TABLE `marketplaceorder` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `servicebooking` ADD COLUMN `equipmentId` VARCHAR(191) NULL,
    ADD COLUMN `problemDescription` TEXT NULL,
    ADD COLUMN `problemImages` JSON NULL;

-- CreateIndex
CREATE INDEX `ServiceBooking_equipmentId_idx` ON `ServiceBooking`(`equipmentId`);

-- AddForeignKey
ALTER TABLE `ServiceBooking` ADD CONSTRAINT `ServiceBooking_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
