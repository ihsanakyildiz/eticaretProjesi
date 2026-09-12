CREATE TABLE `storefront_cart_lines` (
  `id` VARCHAR(191) NOT NULL,
  `sessionKey` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `variantId` VARCHAR(191) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `unitPriceMinor` INTEGER NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `storefront_cart_lines_sessionKey_variantId_key` (`sessionKey`, `variantId`),
  INDEX `storefront_cart_lines_productId_idx` (`productId`),
  INDEX `storefront_cart_lines_updatedAt_idx` (`updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
