-- Isolated customer support chat module tables.
-- Runtime uses raw SQL so a missing Prisma generate does not break the storefront.

CREATE TABLE IF NOT EXISTS `site_modules` (
  `id` VARCHAR(191) NOT NULL,
  `moduleId` VARCHAR(64) NOT NULL,
  `licenseKey` TEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'INACTIVE',
  `activatedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NULL,
  `payloadJson` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `site_modules_moduleId_key` (`moduleId`),
  INDEX `site_modules_status_idx` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_chat_accounts` (
  `id` VARCHAR(191) NOT NULL,
  `channel` VARCHAR(32) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NOT NULL DEFAULT '',
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `credentialsJson` LONGTEXT NOT NULL,
  `webhookSecret` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `support_chat_accounts_channel_idx` (`channel`),
  INDEX `support_chat_accounts_status_idx` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_chat_tags` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `color` VARCHAR(16) NOT NULL DEFAULT '#405189',
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `support_chat_tags_name_key` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_chat_canned_replies` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `body` TEXT NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_chat_conversations` (
  `id` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `channel` VARCHAR(32) NOT NULL,
  `externalThreadId` VARCHAR(191) NOT NULL DEFAULT '',
  `customerName` VARCHAR(191) NOT NULL,
  `customerHandle` VARCHAR(191) NULL,
  `customerAvatar` VARCHAR(500) NULL,
  `lastMessageAt` DATETIME(3) NULL,
  `lastMessagePreview` VARCHAR(280) NOT NULL DEFAULT '',
  `unreadCount` INTEGER NOT NULL DEFAULT 0,
  `assignedUserId` VARCHAR(191) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  `handledBy` VARCHAR(20) NOT NULL DEFAULT 'HUMAN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `support_chat_conversations_accountId_idx` (`accountId`),
  INDEX `support_chat_conversations_assignedUserId_idx` (`assignedUserId`),
  INDEX `support_chat_conversations_lastMessageAt_idx` (`lastMessageAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_chat_messages` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `direction` VARCHAR(8) NOT NULL,
  `body` TEXT NOT NULL,
  `mediaJson` LONGTEXT NULL,
  `externalId` VARCHAR(191) NULL,
  `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `support_chat_messages_conversationId_idx` (`conversationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_chat_notes` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `staffUserId` VARCHAR(191) NULL,
  `body` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `support_chat_notes_conversationId_idx` (`conversationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_chat_conversation_tags` (
  `conversationId` VARCHAR(191) NOT NULL,
  `tagId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`conversationId`, `tagId`),
  INDEX `support_chat_conversation_tags_tagId_idx` (`tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
