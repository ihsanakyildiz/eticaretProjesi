-- AlterTable
ALTER TABLE `storefront_cart_lines` ADD COLUMN `couponCode` VARCHAR(64) NULL;

-- CreateIndex
CREATE INDEX `storefront_cart_lines_couponCode_updatedAt_idx` ON `storefront_cart_lines`(`couponCode`, `updatedAt`);
