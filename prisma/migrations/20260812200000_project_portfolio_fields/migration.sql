-- AlterTable
ALTER TABLE `projects`
  ADD COLUMN `projectUrl` VARCHAR(500) NULL,
  ADD COLUMN `hideProjectUrl` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `clientName` VARCHAR(191) NULL,
  ADD COLUMN `clientLogo` VARCHAR(500) NULL,
  ADD COLUMN `clientSector` VARCHAR(191) NULL,
  ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `projectYear` INTEGER NULL,
  ADD COLUMN `projectRole` VARCHAR(191) NULL,
  ADD COLUMN `projectDuration` VARCHAR(100) NULL;

-- CreateIndex
CREATE INDEX `projects_isFeatured_isActive_idx` ON `projects`(`isFeatured`, `isActive`);

-- CreateTable
CREATE TABLE `project_gallery_images` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `image` VARCHAR(500) NOT NULL,
    `alt` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_gallery_images_projectId_sortOrder_idx`(`projectId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `value` VARCHAR(100) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `project_metrics_projectId_sortOrder_idx`(`projectId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `project_gallery_images` ADD CONSTRAINT `project_gallery_images_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_metrics` ADD CONSTRAINT `project_metrics_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
