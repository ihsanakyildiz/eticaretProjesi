ALTER TABLE `support_chat_conversations`
  ADD COLUMN `folder` VARCHAR(20) NOT NULL DEFAULT 'INBOX';

CREATE INDEX `support_chat_conversations_folder_idx` ON `support_chat_conversations` (`folder`);
