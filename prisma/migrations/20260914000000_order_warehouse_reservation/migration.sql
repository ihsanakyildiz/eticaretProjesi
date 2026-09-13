-- AlterTable
ALTER TABLE `orders` ADD COLUMN `allItemsWarehouseReserved` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `reservedQuantity` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `warehouseReservedAt` DATETIME(3) NULL;
