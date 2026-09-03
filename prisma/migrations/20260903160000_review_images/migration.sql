-- CreateTable
CREATE TABLE `product_review_images` (
    `id` VARCHAR(191) NOT NULL,
    `reviewId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_review_images_reviewId_sortOrder_idx`(`reviewId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_review_images` ADD CONSTRAINT `product_review_images_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `product_reviews`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
