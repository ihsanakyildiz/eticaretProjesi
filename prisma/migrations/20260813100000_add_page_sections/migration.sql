-- CreateEnum PageSectionType + page builder tables

CREATE TABLE `page_sections` (
    `id` VARCHAR(191) NOT NULL,
    `pageId` VARCHAR(191) NOT NULL,
    `type` ENUM('HERO', 'TRUSTED_CLIENTS', 'CARDS', 'ADVANCED_CARD', 'PROJECTS', 'WORKS', 'BLOG', 'FAQ', 'RICH_TEXT', 'PRICING', 'CTA') NOT NULL,
    `label` VARCHAR(191) NULL,
    `title` VARCHAR(255) NULL,
    `subtitle` TEXT NULL,
    `content` LONGTEXT NULL,
    `settings` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `heroId` VARCHAR(191) NULL,
    `faqGroupId` VARCHAR(191) NULL,
    `projectCategoryId` VARCHAR(191) NULL,
    `workCategoryId` VARCHAR(191) NULL,
    `blogCategoryId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `page_section_cards` (
    `sectionId` VARCHAR(191) NOT NULL,
    `cardId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`sectionId`, `cardId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `page_section_projects` (
    `sectionId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`sectionId`, `projectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `page_section_posts` (
    `sectionId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`sectionId`, `postId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `page_section_works` (
    `sectionId` VARCHAR(191) NOT NULL,
    `workId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`sectionId`, `workId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `page_sections_pageId_sortOrder_idx` ON `page_sections`(`pageId`, `sortOrder`);
CREATE INDEX `page_sections_pageId_isActive_idx` ON `page_sections`(`pageId`, `isActive`);
CREATE INDEX `page_sections_type_idx` ON `page_sections`(`type`);
CREATE INDEX `page_section_cards_cardId_idx` ON `page_section_cards`(`cardId`);
CREATE INDEX `page_section_projects_projectId_idx` ON `page_section_projects`(`projectId`);
CREATE INDEX `page_section_posts_postId_idx` ON `page_section_posts`(`postId`);
CREATE INDEX `page_section_works_workId_idx` ON `page_section_works`(`workId`);

ALTER TABLE `page_sections` ADD CONSTRAINT `page_sections_pageId_fkey` FOREIGN KEY (`pageId`) REFERENCES `pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `page_sections` ADD CONSTRAINT `page_sections_heroId_fkey` FOREIGN KEY (`heroId`) REFERENCES `heroes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `page_sections` ADD CONSTRAINT `page_sections_faqGroupId_fkey` FOREIGN KEY (`faqGroupId`) REFERENCES `faq_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `page_sections` ADD CONSTRAINT `page_sections_projectCategoryId_fkey` FOREIGN KEY (`projectCategoryId`) REFERENCES `project_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `page_sections` ADD CONSTRAINT `page_sections_workCategoryId_fkey` FOREIGN KEY (`workCategoryId`) REFERENCES `work_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `page_sections` ADD CONSTRAINT `page_sections_blogCategoryId_fkey` FOREIGN KEY (`blogCategoryId`) REFERENCES `blog_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `page_section_cards` ADD CONSTRAINT `page_section_cards_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `page_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `page_section_cards` ADD CONSTRAINT `page_section_cards_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `cards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `page_section_projects` ADD CONSTRAINT `page_section_projects_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `page_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `page_section_projects` ADD CONSTRAINT `page_section_projects_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `page_section_posts` ADD CONSTRAINT `page_section_posts_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `page_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `page_section_posts` ADD CONSTRAINT `page_section_posts_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `blog_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `page_section_works` ADD CONSTRAINT `page_section_works_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `page_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `page_section_works` ADD CONSTRAINT `page_section_works_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `works`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
