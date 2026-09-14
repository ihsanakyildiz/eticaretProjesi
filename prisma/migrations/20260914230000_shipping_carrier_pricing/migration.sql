-- AlterTable
ALTER TABLE `shipping_carriers` ADD COLUMN `pricingMode` ENUM('FLAT', 'DESI') NOT NULL DEFAULT 'FLAT';
ALTER TABLE `shipping_carriers` ADD COLUMN `flatPriceMinor` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `shipping_carriers` ADD COLUMN `freeShippingEnabled` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `shipping_carriers` ADD COLUMN `freeShippingMinSubtotalMinor` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `shipping_carriers` ADD COLUMN `rateSettings` LONGTEXT NULL;
