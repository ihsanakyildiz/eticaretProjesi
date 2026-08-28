-- AlterTable
ALTER TABLE `work_categories` ADD COLUMN `parentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `work_categories_parentId_idx` ON `work_categories`(`parentId`);

-- AddForeignKey
ALTER TABLE `work_categories` ADD CONSTRAINT `work_categories_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `work_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
