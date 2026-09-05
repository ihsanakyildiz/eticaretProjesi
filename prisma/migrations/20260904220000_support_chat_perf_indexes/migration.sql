CREATE INDEX `support_chat_messages_externalId_idx`
  ON `support_chat_messages` (`externalId`);

CREATE INDEX `support_chat_conversations_accountId_externalThreadId_idx`
  ON `support_chat_conversations` (`accountId`, `externalThreadId`);
