-- AlterTable
ALTER TABLE `products`
    ADD COLUMN `estimatedDelivery` ENUM('SAME_DAY', 'DAYS_1_3', 'DAYS_3_5', 'DAYS_5_10') NULL;
