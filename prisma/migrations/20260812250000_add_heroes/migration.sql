-- CreateTable
CREATE TABLE `heroes` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `autoplay` BOOLEAN NOT NULL DEFAULT true,
    `intervalMs` INTEGER NOT NULL DEFAULT 6000,
    `showDots` BOOLEAN NOT NULL DEFAULT true,
    `showArrows` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `heroes_slug_key`(`slug`),
    INDEX `heroes_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_slides` (
    `id` VARCHAR(191) NOT NULL,
    `heroId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `badgeText` VARCHAR(120) NULL,
    `badgeIcon` VARCHAR(50) NULL,
    `headline` VARCHAR(255) NOT NULL,
    `headlineAccent` VARCHAR(191) NULL,
    `subheadline` TEXT NULL,
    `ctaLabel` VARCHAR(100) NULL,
    `ctaUrl` VARCHAR(500) NULL,
    `trustLabel` VARCHAR(120) NULL,
    `overlayPercent` INTEGER NOT NULL DEFAULT 0,
    `titleColor` VARCHAR(30) NOT NULL DEFAULT '#0f172a',
    `accentColor` VARCHAR(30) NOT NULL DEFAULT '#7c3aed',
    `subtitleColor` VARCHAR(30) NOT NULL DEFAULT '#64748b',
    `ctaBgColor` VARCHAR(30) NOT NULL DEFAULT '#7c3aed',
    `ctaTextColor` VARCHAR(30) NOT NULL DEFAULT '#ffffff',
    `titleFont` VARCHAR(191) NULL,
    `titleSizePx` INTEGER NULL,
    `subtitleSizePx` INTEGER NULL,
    `imageWidthPx` INTEGER NULL,
    `imageHeightPx` INTEGER NULL,
    `layout` ENUM('SPLIT_COLLAGE', 'FULL_BLEED', 'CENTERED') NOT NULL DEFAULT 'SPLIT_COLLAGE',
    `backgroundStyle` VARCHAR(40) NOT NULL DEFAULT 'grid',
    `themeColor` VARCHAR(30) NULL,
    `showStars` BOOLEAN NOT NULL DEFAULT true,
    `starCount` INTEGER NOT NULL DEFAULT 5,
    `showAvatars` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `hero_slides_heroId_sortOrder_idx`(`heroId`, `sortOrder`),
    INDEX `hero_slides_heroId_isActive_idx`(`heroId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hero_slide_media` (
    `id` VARCHAR(191) NOT NULL,
    `slideId` VARCHAR(191) NOT NULL,
    `kind` ENUM('LOGO', 'COLLAGE', 'AVATAR') NOT NULL,
    `image` VARCHAR(500) NOT NULL,
    `alt` VARCHAR(191) NULL,
    `label` VARCHAR(191) NULL,
    `href` VARCHAR(500) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hero_slide_media_slideId_kind_sortOrder_idx`(`slideId`, `kind`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hero_slides` ADD CONSTRAINT `hero_slides_heroId_fkey` FOREIGN KEY (`heroId`) REFERENCES `heroes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `hero_slide_media` ADD CONSTRAINT `hero_slide_media_slideId_fkey` FOREIGN KEY (`slideId`) REFERENCES `hero_slides`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
