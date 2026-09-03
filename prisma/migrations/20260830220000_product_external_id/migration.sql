-- AlterTable
ALTER TABLE `products` ADD COLUMN `externalId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `products_externalId_idx` ON `products`(`externalId`);

-- CreateIndex
CREATE INDEX `products_supplierId_externalId_idx` ON `products`(`supplierId`, `externalId`);
