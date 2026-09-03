-- AlterTable
ALTER TABLE `orders` ADD COLUMN `paymentToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `orders_paymentToken_idx` ON `orders`(`paymentToken`);
