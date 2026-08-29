-- CreateTable
CREATE TABLE `suppliers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(191) NULL,
    `taxNumber` VARCHAR(50) NULL,
    `taxOffice` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(50) NULL,
    `phone2` VARCHAR(50) NULL,
    `whatsapp` VARCHAR(50) NULL,
    `website` VARCHAR(500) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `district` VARCHAR(100) NULL,
    `country` VARCHAR(100) NULL,
    `postalCode` VARCHAR(20) NULL,
    `logo` VARCHAR(500) NULL,
    `description` LONGTEXT NULL,
    `productInfo` LONGTEXT NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `suppliers_slug_key`(`slug`),
    INDEX `suppliers_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    INDEX `suppliers_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `supplierId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `products_supplierId_idx` ON `products`(`supplierId`);

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
