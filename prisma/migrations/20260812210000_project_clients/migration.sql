-- CreateTable
CREATE TABLE `project_clients` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `sector` VARCHAR(191) NULL,
    `logo` VARCHAR(500) NULL,
    `website` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `project_clients_slug_key`(`slug`),
    INDEX `project_clients_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: add clientId, drop inline client fields
ALTER TABLE `projects` ADD COLUMN `clientId` VARCHAR(191) NULL;

-- DropIndex / Drop columns if they exist from previous portfolio migration
ALTER TABLE `projects`
  DROP COLUMN `clientName`,
  DROP COLUMN `clientLogo`,
  DROP COLUMN `clientSector`;

CREATE INDEX `projects_clientId_idx` ON `projects`(`clientId`);

ALTER TABLE `projects` ADD CONSTRAINT `projects_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `project_clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
