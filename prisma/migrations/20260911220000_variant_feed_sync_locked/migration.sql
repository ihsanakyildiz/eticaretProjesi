ALTER TABLE `product_variants`
  ADD COLUMN `feedSyncLocked` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `product_variants_feedSyncLocked_idx` ON `product_variants`(`feedSyncLocked`);
