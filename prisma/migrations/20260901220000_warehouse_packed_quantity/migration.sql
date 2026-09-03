-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `packedQuantity` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `product_variants_barcode_idx` ON `product_variants`(`barcode`);
