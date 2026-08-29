-- AlterTable
ALTER TABLE `products`
    ADD COLUMN `sku` VARCHAR(191) NULL,
    ADD COLUMN `mpn` VARCHAR(64) NULL,
    ADD COLUMN `upc` VARCHAR(64) NULL,
    ADD COLUMN `gtin` VARCHAR(64) NULL,
    ADD COLUMN `isbn` VARCHAR(32) NULL,
    ADD COLUMN `basePriceMinor` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `compareAtMinor` INTEGER NULL,
    ADD COLUMN `costMinor` INTEGER NULL,
    ADD COLUMN `taxRatePercent` INTEGER NOT NULL DEFAULT 20,
    ADD COLUMN `widthCm` DECIMAL(8, 2) NULL,
    ADD COLUMN `heightCm` DECIMAL(8, 2) NULL,
    ADD COLUMN `depthCm` DECIMAL(8, 2) NULL,
    ADD COLUMN `weightKg` DECIMAL(8, 3) NULL,
    ADD COLUMN `extraShippingMinor` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `visibility` ENUM('EVERYWHERE', 'CATALOG', 'SEARCH', 'NONE') NOT NULL DEFAULT 'EVERYWHERE',
    ADD COLUMN `availableForOrder` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `showPrice` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `onlineOnly` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `onSale` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `outOfStockBehavior` ENUM('DENY', 'ALLOW', 'DEFAULT') NOT NULL DEFAULT 'DEFAULT',
    ADD COLUMN `inStockLabel` VARCHAR(191) NULL,
    ADD COLUMN `outOfStockLabel` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `products_sku_key` ON `products`(`sku`);

-- CreateTable
CREATE TABLE `product_images` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `alt` VARCHAR(191) NULL,
    `isCover` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_images_productId_sortOrder_idx`(`productId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
