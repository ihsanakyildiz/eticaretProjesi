-- CreateTable
CREATE TABLE `xml_product_feeds` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(1000) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `supplierId` VARCHAR(191) NULL,
    `defaultCategoryId` VARCHAR(191) NULL,
    `defaultBrandId` VARCHAR(191) NULL,
    `itemPath` VARCHAR(500) NOT NULL DEFAULT '',
    `mappingJson` LONGTEXT NOT NULL,
    `categoryMapJson` LONGTEXT NOT NULL,
    `matchBy` ENUM('BARCODE', 'SKU', 'PRODUCT_CODE') NOT NULL DEFAULT 'BARCODE',
    `skuPrefix` VARCHAR(40) NOT NULL DEFAULT '',
    `httpUser` VARCHAR(191) NULL,
    `httpPass` VARCHAR(191) NULL,
    `createNew` BOOLEAN NOT NULL DEFAULT true,
    `updatePrice` BOOLEAN NOT NULL DEFAULT true,
    `updateStock` BOOLEAN NOT NULL DEFAULT true,
    `updateImages` BOOLEAN NOT NULL DEFAULT false,
    `updateContent` BOOLEAN NOT NULL DEFAULT false,
    `updateTitle` BOOLEAN NOT NULL DEFAULT false,
    `deactivateMissing` BOOLEAN NOT NULL DEFAULT false,
    `priceIncludesTax` BOOLEAN NOT NULL DEFAULT true,
    `priceMarkupPercent` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `priceRound` ENUM('NONE', 'INTEGER', 'NINETY_NINE') NOT NULL DEFAULT 'NONE',
    `intervalMinutes` INTEGER NOT NULL DEFAULT 60,
    `lastRunAt` DATETIME(3) NULL,
    `nextRunAt` DATETIME(3) NULL,
    `lastStatus` VARCHAR(40) NULL,
    `lastMessage` VARCHAR(500) NULL,
    `lastCreatedCount` INTEGER NOT NULL DEFAULT 0,
    `lastUpdatedCount` INTEGER NOT NULL DEFAULT 0,
    `lastSkippedCount` INTEGER NOT NULL DEFAULT 0,
    `lastFailedCount` INTEGER NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `xml_product_feeds_isActive_nextRunAt_idx`(`isActive`, `nextRunAt`),
    INDEX `xml_product_feeds_supplierId_idx`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `xml_product_feed_runs` (
    `id` VARCHAR(191) NOT NULL,
    `feedId` VARCHAR(191) NOT NULL,
    `status` ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `itemCount` INTEGER NOT NULL DEFAULT 0,
    `createdCount` INTEGER NOT NULL DEFAULT 0,
    `updatedCount` INTEGER NOT NULL DEFAULT 0,
    `skippedCount` INTEGER NOT NULL DEFAULT 0,
    `failedCount` INTEGER NOT NULL DEFAULT 0,
    `deactivatedCount` INTEGER NOT NULL DEFAULT 0,
    `message` VARCHAR(500) NULL,
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `xml_product_feed_runs_feedId_createdAt_idx`(`feedId`, `createdAt`),
    INDEX `xml_product_feed_runs_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `xml_product_feeds`
    ADD CONSTRAINT `xml_product_feeds_supplierId_fkey`
    FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `xml_product_feed_runs`
    ADD CONSTRAINT `xml_product_feed_runs_feedId_fkey`
    FOREIGN KEY (`feedId`) REFERENCES `xml_product_feeds`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
