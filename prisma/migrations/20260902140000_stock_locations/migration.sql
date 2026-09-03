-- Pick locations (koridor / raf / göz) per warehouse.

CREATE TABLE `stock_locations` (
    `id` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `aisle` VARCHAR(16) NULL,
    `rack` VARCHAR(16) NULL,
    `shelf` VARCHAR(16) NULL,
    `notes` VARCHAR(255) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `stock_locations_warehouseId_sortOrder_idx`(`warehouseId`, `sortOrder`),
    INDEX `stock_locations_warehouseId_isActive_idx`(`warehouseId`, `isActive`),
    UNIQUE INDEX `stock_locations_warehouseId_code_key`(`warehouseId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `warehouse_stocks` ADD COLUMN `locationId` VARCHAR(191) NULL;
CREATE INDEX `warehouse_stocks_locationId_idx` ON `warehouse_stocks`(`locationId`);

ALTER TABLE `stock_locations` ADD CONSTRAINT `stock_locations_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `stock_warehouses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `warehouse_stocks` ADD CONSTRAINT `warehouse_stocks_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `stock_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
