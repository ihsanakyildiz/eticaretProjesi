ALTER TABLE `campaign_categories`
    ADD CONSTRAINT `campaign_categories_campaignId_fkey`
    FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `campaign_categories`
    ADD CONSTRAINT `campaign_categories_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `product_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `campaign_brands`
    ADD CONSTRAINT `campaign_brands_campaignId_fkey`
    FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `campaign_brands`
    ADD CONSTRAINT `campaign_brands_brandId_fkey`
    FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `campaign_products`
    ADD CONSTRAINT `campaign_products_campaignId_fkey`
    FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `campaign_products`
    ADD CONSTRAINT `campaign_products_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
