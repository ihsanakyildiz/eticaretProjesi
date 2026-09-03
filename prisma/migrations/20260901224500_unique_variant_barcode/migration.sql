-- Unique barcode per variant. MySQL allows multiple NULLs.
-- This fails while duplicate barcodes still exist; the admin duplicate-barcodes
-- page retries the unique index after the catalog is clean.

CREATE UNIQUE INDEX `product_variants_barcode_key` ON `product_variants`(`barcode`);

DROP INDEX `product_variants_barcode_idx` ON `product_variants`;
