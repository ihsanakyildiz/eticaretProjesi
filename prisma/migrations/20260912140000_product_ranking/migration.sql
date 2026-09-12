ALTER TABLE `products` ADD COLUMN `boostScore` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `products` ADD COLUMN `rankScore` INTEGER NOT NULL DEFAULT 0;
CREATE INDEX `products_isActive_rankScore_idx` ON `products`(`isActive`, `rankScore`);
CREATE INDEX `products_rankScore_idx` ON `products`(`rankScore`);

UPDATE `products`
SET `rankScore` = `boostScore` * 1000 + FLOOR(LN(1 + `clickCount`) * 80 + LN(1 + `viewCount`) * 20)
WHERE `clickCount` > 0 OR `viewCount` > 0 OR `boostScore` > 0;

CREATE TABLE `product_placements` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `kind` ENUM('CATEGORY', 'SEARCH') NOT NULL,
  `scopeKey` VARCHAR(200) NOT NULL,
  `categoryId` VARCHAR(191) NULL,
  `searchTerm` VARCHAR(160) NOT NULL DEFAULT '',
  `boost` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `product_placements_productId_scopeKey_key` (`productId`, `scopeKey`),
  INDEX `product_placements_kind_categoryId_isActive_idx` (`kind`, `categoryId`, `isActive`),
  INDEX `product_placements_kind_searchTerm_isActive_idx` (`kind`, `searchTerm`, `isActive`),
  CONSTRAINT `product_placements_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_placements_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `product_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
