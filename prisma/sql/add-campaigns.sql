CREATE TABLE IF NOT EXISTS `campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `kind` ENUM('PERCENT_OFF', 'FIXED_OFF', 'FREE_SHIPPING', 'CART_PERCENT') NOT NULL,
    `valueInt` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `countdown` BOOLEAN NOT NULL DEFAULT false,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `inStockOnly` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `campaigns_status_startsAt_endsAt_idx`(`status`, `startsAt`, `endsAt`),
    INDEX `campaigns_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `campaign_categories` (
    `campaignId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    INDEX `campaign_categories_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`campaignId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `campaign_brands` (
    `campaignId` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    INDEX `campaign_brands_brandId_idx`(`brandId`),
    PRIMARY KEY (`campaignId`, `brandId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `campaign_products` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `snapshotJson` LONGTEXT NOT NULL,
    `restoredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `campaign_products_campaignId_productId_key`(`campaignId`, `productId`),
    INDEX `campaign_products_productId_idx`(`productId`),
    INDEX `campaign_products_restoredAt_idx`(`restoredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
