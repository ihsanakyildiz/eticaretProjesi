CREATE TABLE IF NOT EXISTS `support_chat_ignored_messages` (
  `externalId` VARCHAR(191) NOT NULL,
  `ignoredAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`externalId`)
);

ALTER TABLE `support_chat_thread_blocks`
  ADD COLUMN `cutoffMs` BIGINT NULL;

UPDATE `support_chat_thread_blocks`
SET `cutoffMs` = UNIX_TIMESTAMP(`blockedAt`) * 1000
WHERE `cutoffMs` IS NULL;
