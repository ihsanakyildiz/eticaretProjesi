-- CreateTable
CREATE TABLE `pages` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('CLASSIC', 'ADVANCED') NOT NULL DEFAULT 'CLASSIC',
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `summary` TEXT NULL,
    `content` LONGTEXT NULL,
    `image` VARCHAR(500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `seoTitle` VARCHAR(191) NULL,
    `seoDescription` VARCHAR(500) NULL,
    `builderData` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pages_slug_key`(`slug`),
    INDEX `pages_type_isActive_sortOrder_idx`(`type`, `isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PageToWorks` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_PageToWorks_AB_unique`(`A`, `B`),
    INDEX `_PageToWorks_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PageToProjects` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_PageToProjects_AB_unique`(`A`, `B`),
    INDEX `_PageToProjects_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PageToPosts` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_PageToPosts_AB_unique`(`A`, `B`),
    INDEX `_PageToPosts_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_PageToWorks` ADD CONSTRAINT `_PageToWorks_A_fkey` FOREIGN KEY (`A`) REFERENCES `pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `_PageToWorks` ADD CONSTRAINT `_PageToWorks_B_fkey` FOREIGN KEY (`B`) REFERENCES `works`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_PageToProjects` ADD CONSTRAINT `_PageToProjects_A_fkey` FOREIGN KEY (`A`) REFERENCES `pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `_PageToProjects` ADD CONSTRAINT `_PageToProjects_B_fkey` FOREIGN KEY (`B`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `_PageToPosts` ADD CONSTRAINT `_PageToPosts_A_fkey` FOREIGN KEY (`A`) REFERENCES `blog_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `_PageToPosts` ADD CONSTRAINT `_PageToPosts_B_fkey` FOREIGN KEY (`B`) REFERENCES `pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
