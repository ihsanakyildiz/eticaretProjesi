-- CreateTable
CREATE TABLE `order_cases` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `kind` ENUM('CANCEL', 'RETURN') NOT NULL,
    `status` ENUM('REQUESTED', 'REJECTED', 'APPROVED', 'AWAITING_RETURN', 'RECEIVED', 'COMPLETED') NOT NULL,
    `reason` ENUM('CHANGED_MIND', 'DEFECTIVE', 'WRONG_ITEM', 'DAMAGED', 'NOT_DELIVERED', 'OTHER') NOT NULL,
    `source` VARCHAR(16) NOT NULL DEFAULT 'STAFF',
    `customerNote` VARCHAR(500) NULL,
    `staffNote` VARCHAR(500) NULL,
    `rejectReason` VARCHAR(500) NULL,
    `refundAmountMinor` INTEGER NULL,
    `returnless` BOOLEAN NOT NULL DEFAULT false,
    `returnCarrierName` VARCHAR(191) NULL,
    `returnTrackingNumber` VARCHAR(100) NULL,
    `receivedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `order_cases_code_key`(`code`),
    INDEX `order_cases_orderId_createdAt_idx`(`orderId`, `createdAt`),
    INDEX `order_cases_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_case_items` (
    `id` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `condition` ENUM('PENDING', 'SELLABLE', 'UNSALEABLE') NOT NULL DEFAULT 'PENDING',
    `restockQuantity` INTEGER NOT NULL DEFAULT 0,

    INDEX `order_case_items_orderItemId_idx`(`orderItemId`),
    UNIQUE INDEX `order_case_items_caseId_orderItemId_key`(`caseId`, `orderItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_case_events` (
    `id` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NOT NULL,
    `status` ENUM('REQUESTED', 'REJECTED', 'APPROVED', 'AWAITING_RETURN', 'RECEIVED', 'COMPLETED') NOT NULL,
    `note` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_case_events_caseId_createdAt_idx`(`caseId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `order_refunds` ADD COLUMN `caseId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `order_refunds_caseId_idx` ON `order_refunds`(`caseId`);

-- AddForeignKey
ALTER TABLE `order_cases` ADD CONSTRAINT `order_cases_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_case_items` ADD CONSTRAINT `order_case_items_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `order_cases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_case_items` ADD CONSTRAINT `order_case_items_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `order_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_case_events` ADD CONSTRAINT `order_case_events_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `order_cases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_refunds` ADD CONSTRAINT `order_refunds_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `order_cases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
