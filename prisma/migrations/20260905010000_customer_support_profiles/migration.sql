ALTER TABLE `users`
  ADD COLUMN `customerSource` VARCHAR(32) NOT NULL DEFAULT 'STORE',
  ADD COLUMN `supportChannel` VARCHAR(32) NULL,
  ADD COLUMN `supportIdentity` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `users_supportIdentity_key` ON `users`(`supportIdentity`);

CREATE INDEX `users_customerSource_idx` ON `users`(`customerSource`);

ALTER TABLE `support_chat_conversations`
  ADD COLUMN `customerUserId` VARCHAR(191) NULL;

CREATE INDEX `support_chat_conversations_customerUserId_idx`
  ON `support_chat_conversations`(`customerUserId`);

ALTER TABLE `support_chat_conversations`
  ADD CONSTRAINT `support_chat_conversations_customerUserId_fkey`
  FOREIGN KEY (`customerUserId`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
