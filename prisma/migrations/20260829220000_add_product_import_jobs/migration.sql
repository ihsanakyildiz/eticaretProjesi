-- CreateTable
CREATE TABLE `product_import_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `status` ENUM('PREVIEW', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PREVIEW',
    `rowCount` INTEGER NOT NULL DEFAULT 0,
    `readyCount` INTEGER NOT NULL DEFAULT 0,
    `zeroPriceCount` INTEGER NOT NULL DEFAULT 0,
    `errorCount` INTEGER NOT NULL DEFAULT 0,
    `importedCount` INTEGER NOT NULL DEFAULT 0,
    `failedCount` INTEGER NOT NULL DEFAULT 0,
    `currentTitle` VARCHAR(191) NULL,
    `currentRow` INTEGER NULL,
    `error` VARCHAR(500) NULL,
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `product_import_jobs_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_import_job_rows` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `rowNumber` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(80) NOT NULL,
    `barcode` VARCHAR(64) NOT NULL,
    `price` VARCHAR(40) NOT NULL,
    `stock` VARCHAR(20) NOT NULL,
    `kind` ENUM('READY', 'ZERO_PRICE', 'ERROR') NOT NULL,
    `work` ENUM('PENDING', 'IMPORTED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `errors` VARCHAR(1000) NOT NULL DEFAULT '',
    `rawJson` LONGTEXT NOT NULL,
    `productId` VARCHAR(191) NULL,

    INDEX `product_import_job_rows_jobId_kind_rowNumber_idx`(`jobId`, `kind`, `rowNumber`),
    INDEX `product_import_job_rows_jobId_work_rowNumber_idx`(`jobId`, `work`, `rowNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_import_job_rows`
    ADD CONSTRAINT `product_import_job_rows_jobId_fkey`
    FOREIGN KEY (`jobId`) REFERENCES `product_import_jobs`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
