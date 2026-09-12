-- Kişiye özel ürün alanları + sipariş satırı özeti
CREATE TABLE IF NOT EXISTS `product_personalization_fields` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `kind` ENUM('TEXT', 'IMAGE') NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `required` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `maxLength` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `product_personalization_fields_productId_sortOrder_idx` (`productId`, `sortOrder`),
  CONSTRAINT `product_personalization_fields_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- order_items.personalizationJson ensure script ile eklenir (migrate deploy engelli ortamlarda)
