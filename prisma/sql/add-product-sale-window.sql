ALTER TABLE `product_variants`
  ADD COLUMN `saleStartsAt` DATETIME(3) NULL,
  ADD COLUMN `saleEndsAt` DATETIME(3) NULL;

ALTER TABLE `products`
  ADD COLUMN `saleStartsAt` DATETIME(3) NULL,
  ADD COLUMN `saleEndsAt` DATETIME(3) NULL;

CREATE INDEX `product_variants_saleEndsAt_idx` ON `product_variants` (`saleEndsAt`);
CREATE INDEX `products_saleEndsAt_idx` ON `products` (`saleEndsAt`);
