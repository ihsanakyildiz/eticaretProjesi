CREATE TABLE `search_terms` (
  `id` VARCHAR(191) NOT NULL,
  `term` VARCHAR(160) NOT NULL,
  `displayTerm` VARCHAR(160) NOT NULL,
  `score` INTEGER NOT NULL DEFAULT 0,
  `searchCount` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `search_terms_term_key` (`term`),
  INDEX `search_terms_isActive_score_searchCount_idx` (`isActive`, `score`, `searchCount`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
