-- AlterTable
ALTER TABLE `equipment` ADD COLUMN `brand` VARCHAR(191) NULL,
    ADD COLUMN `equipmentTypeId` VARCHAR(191) NULL,
    ADD COLUMN `installLocation` VARCHAR(191) NULL,
    ADD COLUMN `model` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `marketplaceorder` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- CreateTable
CREATE TABLE `EquipmentCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `icon` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EquipmentCategory_name_key`(`name`),
    INDEX `EquipmentCategory_isActive_idx`(`isActive`),
    INDEX `EquipmentCategory_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentType` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `brand` VARCHAR(191) NULL,
    `avgLifespanMonths` INTEGER NULL,
    `avgWarrantyMonths` INTEGER NULL,
    `imageUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EquipmentType_categoryId_idx`(`categoryId`),
    INDEX `EquipmentType_isActive_idx`(`isActive`),
    UNIQUE INDEX `EquipmentType_categoryId_name_key`(`categoryId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentServiceTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `equipmentTypeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `estimatedPrice` INTEGER NULL,
    `duration` INTEGER NULL,
    `frequency` VARCHAR(191) NULL,
    `isCommon` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EquipmentServiceTemplate_equipmentTypeId_idx`(`equipmentTypeId`),
    INDEX `EquipmentServiceTemplate_isActive_idx`(`isActive`),
    INDEX `EquipmentServiceTemplate_isCommon_idx`(`isCommon`),
    UNIQUE INDEX `EquipmentServiceTemplate_equipmentTypeId_name_key`(`equipmentTypeId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentPartTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `equipmentTypeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `partNumber` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `estimatedPrice` INTEGER NULL,
    `isCommon` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EquipmentPartTemplate_equipmentTypeId_idx`(`equipmentTypeId`),
    INDEX `EquipmentPartTemplate_isActive_idx`(`isActive`),
    INDEX `EquipmentPartTemplate_isCommon_idx`(`isCommon`),
    UNIQUE INDEX `EquipmentPartTemplate_equipmentTypeId_name_key`(`equipmentTypeId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashbookEntry` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `entryType` ENUM('CASH_IN', 'CASH_OUT', 'BANK_IN', 'BANK_OUT') NOT NULL,
    `amount` INTEGER NOT NULL,
    `paymentMode` ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'OTHER') NOT NULL DEFAULT 'CASH',
    `category` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `referenceNo` VARCHAR(191) NULL,
    `entryDate` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CashbookEntry_ownerId_idx`(`ownerId`),
    INDEX `CashbookEntry_restaurantId_idx`(`restaurantId`),
    INDEX `CashbookEntry_entryType_idx`(`entryType`),
    INDEX `CashbookEntry_entryDate_idx`(`entryDate`),
    INDEX `CashbookEntry_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VendorLedger` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `vendorName` VARCHAR(191) NOT NULL,
    `vendorPhone` VARCHAR(191) NULL,
    `vendorGST` VARCHAR(191) NULL,
    `entryType` ENUM('PURCHASE', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE') NOT NULL,
    `amount` INTEGER NOT NULL,
    `paymentMode` ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'OTHER') NULL,
    `description` TEXT NOT NULL,
    `billNumber` VARCHAR(191) NULL,
    `billDate` DATETIME(3) NULL,
    `dueDate` DATETIME(3) NULL,
    `referenceNo` VARCHAR(191) NULL,
    `entryDate` DATETIME(3) NOT NULL,
    `balanceAfter` INTEGER NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `VendorLedger_ownerId_idx`(`ownerId`),
    INDEX `VendorLedger_restaurantId_idx`(`restaurantId`),
    INDEX `VendorLedger_vendorName_idx`(`vendorName`),
    INDEX `VendorLedger_entryType_idx`(`entryType`),
    INDEX `VendorLedger_entryDate_idx`(`entryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Staff` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `designation` VARCHAR(191) NOT NULL,
    `staffType` ENUM('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN') NOT NULL DEFAULT 'FULL_TIME',
    `status` ENUM('ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
    `joiningDate` DATETIME(3) NOT NULL,
    `leavingDate` DATETIME(3) NULL,
    `monthlySalary` INTEGER NULL,
    `dailyWage` INTEGER NULL,
    `address` TEXT NULL,
    `aadharNumber` VARCHAR(191) NULL,
    `panNumber` VARCHAR(191) NULL,
    `photoUrl` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Staff_ownerId_idx`(`ownerId`),
    INDEX `Staff_restaurantId_idx`(`restaurantId`),
    INDEX `Staff_status_idx`(`status`),
    INDEX `Staff_designation_idx`(`designation`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffAttendance` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `attendanceDate` DATETIME(3) NOT NULL,
    `status` ENUM('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'WEEKLY_OFF') NOT NULL,
    `checkInTime` DATETIME(3) NULL,
    `checkOutTime` DATETIME(3) NULL,
    `workHours` DOUBLE NULL,
    `notes` TEXT NULL,
    `markedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffAttendance_staffId_idx`(`staffId`),
    INDEX `StaffAttendance_restaurantId_idx`(`restaurantId`),
    INDEX `StaffAttendance_attendanceDate_idx`(`attendanceDate`),
    INDEX `StaffAttendance_status_idx`(`status`),
    UNIQUE INDEX `StaffAttendance_staffId_attendanceDate_key`(`staffId`, `attendanceDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffSalary` (
    `id` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `restaurantId` VARCHAR(191) NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `basicSalary` INTEGER NOT NULL,
    `allowances` INTEGER NOT NULL DEFAULT 0,
    `deductions` INTEGER NOT NULL DEFAULT 0,
    `totalPayable` INTEGER NOT NULL,
    `totalPaid` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'PARTIALLY_PAID', 'PAID') NOT NULL DEFAULT 'PENDING',
    `daysWorked` INTEGER NULL,
    `totalDays` INTEGER NULL,
    `paymentMode` ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'OTHER') NULL,
    `paymentDate` DATETIME(3) NULL,
    `referenceNo` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `generatedBy` VARCHAR(191) NOT NULL,
    `paidBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffSalary_staffId_idx`(`staffId`),
    INDEX `StaffSalary_restaurantId_idx`(`restaurantId`),
    INDEX `StaffSalary_status_idx`(`status`),
    INDEX `StaffSalary_month_year_idx`(`month`, `year`),
    UNIQUE INDEX `StaffSalary_staffId_month_year_key`(`staffId`, `month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Equipment_equipmentTypeId_idx` ON `Equipment`(`equipmentTypeId`);

-- AddForeignKey
ALTER TABLE `EquipmentType` ADD CONSTRAINT `EquipmentType_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `EquipmentCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentServiceTemplate` ADD CONSTRAINT `EquipmentServiceTemplate_equipmentTypeId_fkey` FOREIGN KEY (`equipmentTypeId`) REFERENCES `EquipmentType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentPartTemplate` ADD CONSTRAINT `EquipmentPartTemplate_equipmentTypeId_fkey` FOREIGN KEY (`equipmentTypeId`) REFERENCES `EquipmentType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Equipment` ADD CONSTRAINT `Equipment_equipmentTypeId_fkey` FOREIGN KEY (`equipmentTypeId`) REFERENCES `EquipmentType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashbookEntry` ADD CONSTRAINT `CashbookEntry_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashbookEntry` ADD CONSTRAINT `CashbookEntry_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorLedger` ADD CONSTRAINT `VendorLedger_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorLedger` ADD CONSTRAINT `VendorLedger_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffAttendance` ADD CONSTRAINT `StaffAttendance_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffAttendance` ADD CONSTRAINT `StaffAttendance_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffSalary` ADD CONSTRAINT `StaffSalary_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `Staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffSalary` ADD CONSTRAINT `StaffSalary_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
