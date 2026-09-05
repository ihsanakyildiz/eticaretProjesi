CREATE TABLE IF NOT EXISTS `support_chat_settings` (
  `settingKey` VARCHAR(100) NOT NULL,
  `settingValue` TEXT NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`settingKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_chat_oauth_sessions` (
  `id` VARCHAR(191) NOT NULL,
  `state` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `accessToken` TEXT NOT NULL,
  `assetsJson` LONGTEXT NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `support_chat_oauth_sessions_state_key` (`state`),
  INDEX `support_chat_oauth_sessions_expiresAt_idx` (`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
