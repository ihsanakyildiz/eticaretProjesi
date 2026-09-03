-- Multi-warehouse inventory: locations, on-hand, documents, movements.

-- CreateTable
CREATE TABLE `stock_warehouses` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `city` VARCHAR(100) NULL,
    `district` VARCHAR(100) NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(50) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stock_warehouses_code_key`(`code`),
    INDEX `stock_warehouses_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    INDEX `stock_warehouses_isDefault_idx`(`isDefault`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouse_stocks` (
    `id` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `reservedQuantity` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `warehouse_stocks_variantId_idx`(`variantId`),
    INDEX `warehouse_stocks_warehouseId_quantity_idx`(`warehouseId`, `quantity`),
    UNIQUE INDEX `warehouse_stocks_warehouseId_variantId_key`(`warehouseId`, `variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_documents` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('GOODS_RECEIPT', 'PURCHASE_INVOICE', 'GOODS_ISSUE', 'TRANSFER', 'ADJUSTMENT', 'COUNT', 'SUPPLIER_RETURN', 'CUSTOMER_RETURN') NOT NULL,
    `status` ENUM('DRAFT', 'CONFIRMED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
    `number` VARCHAR(32) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `targetWarehouseId` VARCHAR(191) NULL,
    `supplierId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `relatedDocumentId` VARCHAR(191) NULL,
    `externalNumber` VARCHAR(64) NULL,
    `documentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `confirmedById` VARCHAR(191) NULL,
    `canceledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stock_documents_number_key`(`number`),
    INDEX `stock_documents_kind_status_documentDate_idx`(`kind`, `status`, `documentDate`),
    INDEX `stock_documents_warehouseId_status_idx`(`warehouseId`, `status`),
    INDEX `stock_documents_supplierId_idx`(`supplierId`),
    INDEX `stock_documents_orderId_idx`(`orderId`),
    INDEX `stock_documents_relatedDocumentId_idx`(`relatedDocumentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_document_lines` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitCostMinor` INTEGER NULL,
    `notes` VARCHAR(255) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `stock_document_lines_documentId_sortOrder_idx`(`documentId`, `sortOrder`),
    INDEX `stock_document_lines_variantId_idx`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `id` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `kind` ENUM('OPENING', 'RECEIPT', 'ISSUE', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT', 'COUNT', 'SALE', 'CUSTOMER_RETURN', 'SUPPLIER_RETURN', 'CATALOG') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `balanceAfter` INTEGER NOT NULL,
    `note` VARCHAR(255) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_movements_warehouseId_createdAt_idx`(`warehouseId`, `createdAt`),
    INDEX `stock_movements_variantId_createdAt_idx`(`variantId`, `createdAt`),
    INDEX `stock_movements_documentId_idx`(`documentId`),
    INDEX `stock_movements_orderId_idx`(`orderId`),
    INDEX `stock_movements_kind_createdAt_idx`(`kind`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `warehouse_stocks` ADD CONSTRAINT `warehouse_stocks_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `stock_warehouses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `warehouse_stocks` ADD CONSTRAINT `warehouse_stocks_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `stock_documents` ADD CONSTRAINT `stock_documents_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `stock_warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `stock_documents` ADD CONSTRAINT `stock_documents_targetWarehouseId_fkey` FOREIGN KEY (`targetWarehouseId`) REFERENCES `stock_warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `stock_documents` ADD CONSTRAINT `stock_documents_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `stock_documents` ADD CONSTRAINT `stock_documents_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `stock_documents` ADD CONSTRAINT `stock_documents_relatedDocumentId_fkey` FOREIGN KEY (`relatedDocumentId`) REFERENCES `stock_documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `stock_documents` ADD CONSTRAINT `stock_documents_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `stock_documents` ADD CONSTRAINT `stock_documents_confirmedById_fkey` FOREIGN KEY (`confirmedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `stock_document_lines` ADD CONSTRAINT `stock_document_lines_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `stock_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `stock_document_lines` ADD CONSTRAINT `stock_document_lines_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `stock_warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `stock_documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default warehouse and copy existing catalog stock onto it.
INSERT INTO `stock_warehouses` (`id`, `code`, `name`, `city`, `isActive`, `isDefault`, `sortOrder`, `createdAt`, `updatedAt`)
VALUES ('cminvwarehouse000000merkez', 'MERKEZ', 'Merkez Depo', NULL, true, true, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT INTO `warehouse_stocks` (`id`, `warehouseId`, `variantId`, `quantity`, `reservedQuantity`, `updatedAt`)
SELECT CONCAT('cminvws', `id`), 'cminvwarehouse000000merkez', `id`, `stockQuantity`, 0, CURRENT_TIMESTAMP(3)
FROM `product_variants`
WHERE `stockQuantity` <> 0;

INSERT INTO `stock_movements` (`id`, `warehouseId`, `variantId`, `kind`, `quantity`, `balanceAfter`, `note`, `createdAt`)
SELECT CONCAT('cminvsm', `id`), 'cminvwarehouse000000merkez', `id`, 'OPENING', `stockQuantity`, `stockQuantity`, 'Mevcut katalog stoğu', CURRENT_TIMESTAMP(3)
FROM `product_variants`
WHERE `stockQuantity` <> 0;
