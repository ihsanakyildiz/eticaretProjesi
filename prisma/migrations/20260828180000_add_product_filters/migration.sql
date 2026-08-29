-- CreateTable
CREATE TABLE `product_filters` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `kind` ENUM('CUSTOM', 'VARIANT', 'SYSTEM') NOT NULL,
    `systemKey` ENUM('BRAND', 'PRICE', 'AVAILABILITY') NULL,
    `variantAttributeId` VARCHAR(191) NULL,
    `inputType` ENUM('MULTI_SELECT', 'SWATCH', 'BOOLEAN', 'RANGE') NOT NULL,
    `unit` VARCHAR(20) NULL,
    `hideEmptyValues` BOOLEAN NOT NULL DEFAULT true,
    `showProductCount` BOOLEAN NOT NULL DEFAULT true,
    `appliesGlobally` BOOLEAN NOT NULL DEFAULT false,
    `inheritToChildren` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_filters_slug_key`(`slug`),
    UNIQUE INDEX `product_filters_variantAttributeId_key`(`variantAttributeId`),
    UNIQUE INDEX `product_filters_systemKey_key`(`systemKey`),
    INDEX `product_filters_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    INDEX `product_filters_kind_isActive_idx`(`kind`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_filter_values` (
    `id` VARCHAR(191) NOT NULL,
    `filterId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `colorHex` VARCHAR(20) NULL,
    `image` VARCHAR(500) NULL,
    `numberValue` DECIMAL(12, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_filter_values_filterId_slug_key`(`filterId`, `slug`),
    INDEX `product_filter_values_filterId_sortOrder_idx`(`filterId`, `sortOrder`),
    INDEX `product_filter_values_filterId_isActive_idx`(`filterId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_filter_categories` (
    `filterId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    INDEX `product_filter_categories_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`filterId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_filter_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `filterId` VARCHAR(191) NOT NULL,
    `valueId` VARCHAR(191) NULL,
    `numberValue` DECIMAL(12, 2) NULL,
    `booleanValue` BOOLEAN NULL,

    INDEX `product_filter_assignments_productId_filterId_idx`(`productId`, `filterId`),
    INDEX `product_filter_assignments_filterId_valueId_idx`(`filterId`, `valueId`),
    INDEX `product_filter_assignments_filterId_booleanValue_idx`(`filterId`, `booleanValue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_filters` ADD CONSTRAINT `product_filters_variantAttributeId_fkey` FOREIGN KEY (`variantAttributeId`) REFERENCES `product_attributes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_filter_values` ADD CONSTRAINT `product_filter_values_filterId_fkey` FOREIGN KEY (`filterId`) REFERENCES `product_filters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_filter_categories` ADD CONSTRAINT `product_filter_categories_filterId_fkey` FOREIGN KEY (`filterId`) REFERENCES `product_filters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_filter_categories` ADD CONSTRAINT `product_filter_categories_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `product_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_filter_assignments` ADD CONSTRAINT `product_filter_assignments_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_filter_assignments` ADD CONSTRAINT `product_filter_assignments_filterId_fkey` FOREIGN KEY (`filterId`) REFERENCES `product_filters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_filter_assignments` ADD CONSTRAINT `product_filter_assignments_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `product_filter_values`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
