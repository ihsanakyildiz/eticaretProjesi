-- AlterTable
ALTER TABLE `product_categories` ADD COLUMN `urlId` INTEGER NULL;

UPDATE `product_categories` AS `p`
INNER JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `createdAt` ASC, `id` ASC) AS `rn`
  FROM `product_categories`
) AS `numbered` ON `p`.`id` = `numbered`.`id`
SET `p`.`urlId` = `numbered`.`rn`;

ALTER TABLE `product_categories`
  MODIFY `urlId` INTEGER NOT NULL AUTO_INCREMENT,
  ADD UNIQUE INDEX `product_categories_urlId_key`(`urlId`);

-- AlterTable
ALTER TABLE `brands` ADD COLUMN `urlId` INTEGER NULL;

UPDATE `brands` AS `p`
INNER JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `createdAt` ASC, `id` ASC) AS `rn`
  FROM `brands`
) AS `numbered` ON `p`.`id` = `numbered`.`id`
SET `p`.`urlId` = `numbered`.`rn`;

ALTER TABLE `brands`
  MODIFY `urlId` INTEGER NOT NULL AUTO_INCREMENT,
  ADD UNIQUE INDEX `brands_urlId_key`(`urlId`);

-- AlterTable
ALTER TABLE `products` ADD COLUMN `urlId` INTEGER NULL;

UPDATE `products` AS `p`
INNER JOIN (
  SELECT `id`, ROW_NUMBER() OVER (ORDER BY `createdAt` ASC, `id` ASC) AS `rn`
  FROM `products`
) AS `numbered` ON `p`.`id` = `numbered`.`id`
SET `p`.`urlId` = `numbered`.`rn`;

ALTER TABLE `products`
  MODIFY `urlId` INTEGER NOT NULL AUTO_INCREMENT,
  ADD UNIQUE INDEX `products_urlId_key`(`urlId`);
