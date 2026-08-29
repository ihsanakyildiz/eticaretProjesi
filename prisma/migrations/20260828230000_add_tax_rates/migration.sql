-- CreateTable
CREATE TABLE `tax_rates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `percent` INTEGER NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tax_rates_percent_key`(`percent`),
    INDEX `tax_rates_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed common TR VAT rates
INSERT INTO `tax_rates` (`id`, `name`, `percent`, `isDefault`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
    ('taxrate_percent_01', 'KDV %1', 1, false, true, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('taxrate_percent_10', 'KDV %10', 10, false, true, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('taxrate_percent_20', 'KDV %20', 20, true, true, 2, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
