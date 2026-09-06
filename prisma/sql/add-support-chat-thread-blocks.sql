CREATE TABLE IF NOT EXISTS `support_chat_thread_blocks` (
  `id` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `channel` VARCHAR(32) NOT NULL,
  `externalThreadId` VARCHAR(191) NOT NULL,
  `blockedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `support_chat_thread_blocks_account_thread_key` (`accountId`, `externalThreadId`),
  INDEX `support_chat_thread_blocks_blockedAt_idx` (`blockedAt`)
);
