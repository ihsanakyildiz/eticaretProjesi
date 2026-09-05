ALTER TABLE `support_chat_conversations`
  ADD COLUMN `departmentId` VARCHAR(191) NULL;

CREATE INDEX `support_chat_conversations_departmentId_idx`
  ON `support_chat_conversations`(`departmentId`);

ALTER TABLE `support_chat_conversations`
  ADD CONSTRAINT `support_chat_conversations_departmentId_fkey`
  FOREIGN KEY (`departmentId`) REFERENCES `support_chat_departments`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
