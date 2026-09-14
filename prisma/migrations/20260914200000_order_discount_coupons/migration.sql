-- AlterTable
ALTER TABLE `orders` ADD COLUMN `couponCode` VARCHAR(64) NULL;
ALTER TABLE `orders` ADD COLUMN `couponDiscountMinor` INTEGER NOT NULL DEFAULT 0;
