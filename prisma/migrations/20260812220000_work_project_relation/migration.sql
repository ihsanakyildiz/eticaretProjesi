-- CreateTable
CREATE TABLE `_WorkToProjects` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_WorkToProjects_AB_unique`(`A`, `B`),
    INDEX `_WorkToProjects_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_WorkToProjects` ADD CONSTRAINT `_WorkToProjects_A_fkey` FOREIGN KEY (`A`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_WorkToProjects` ADD CONSTRAINT `_WorkToProjects_B_fkey` FOREIGN KEY (`B`) REFERENCES `works`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
