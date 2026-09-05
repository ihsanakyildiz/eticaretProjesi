ALTER TABLE `support_chat_accounts`
  ADD COLUMN `departmentId` VARCHAR(191) NULL;

CREATE INDEX `support_chat_accounts_departmentId_idx`
  ON `support_chat_accounts`(`departmentId`);

ALTER TABLE `support_chat_accounts`
  ADD CONSTRAINT `support_chat_accounts_departmentId_fkey`
  FOREIGN KEY (`departmentId`) REFERENCES `support_chat_departments`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
