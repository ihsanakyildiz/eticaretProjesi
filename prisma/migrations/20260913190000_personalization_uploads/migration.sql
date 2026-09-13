-- Sepette kalan kişiye özel baskı görsellerini takip etmek için
CREATE TABLE IF NOT EXISTS `personalization_uploads` (
  `id` VARCHAR(191) NOT NULL,
  `publicPath` VARCHAR(500) NOT NULL,
  `orderId` VARCHAR(191) NULL,
  `claimedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `personalization_uploads_publicPath_key` (`publicPath`),
  INDEX `personalization_uploads_claimedAt_createdAt_idx` (`claimedAt`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
