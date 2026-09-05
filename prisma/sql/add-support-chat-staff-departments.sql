CREATE TABLE IF NOT EXISTS `support_chat_staff_departments` (
  `userId` VARCHAR(191) NOT NULL,
  `departmentId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`userId`, `departmentId`),
  INDEX `support_chat_staff_departments_departmentId_idx` (`departmentId`),
  CONSTRAINT `support_chat_staff_departments_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `support_chat_staff_departments_departmentId_fkey`
    FOREIGN KEY (`departmentId`) REFERENCES `support_chat_departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
