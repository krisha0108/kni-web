-- AlterTable
ALTER TABLE `restaurant` ADD COLUMN `fssaiCertificateUrl` VARCHAR(191) NULL,
    ADD COLUMN `fssaiNumber` VARCHAR(191) NULL,
    ADD COLUMN `restaurantImageUrl` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Restaurant_fssaiNumber_idx` ON `Restaurant`(`fssaiNumber`);
