ALTER TABLE `personalization_uploads`
  ADD COLUMN `thumbPath` VARCHAR(500) NULL,
  ADD COLUMN `originalPurgedAt` DATETIME(3) NULL;

CREATE INDEX `personalization_uploads_orderId_originalPurgedAt_idx`
  ON `personalization_uploads` (`orderId`, `originalPurgedAt`);
