ALTER TABLE `product_attributes`
  MODIFY `displayType` ENUM('TEXT', 'COLOR', 'IMAGE', 'BUTTON') NOT NULL DEFAULT 'TEXT';
