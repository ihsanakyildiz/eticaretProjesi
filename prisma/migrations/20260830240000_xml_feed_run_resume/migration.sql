ALTER TABLE `xml_product_feed_runs`
    ADD COLUMN `cursor` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `seenIdsJson` TEXT NOT NULL DEFAULT ('[]');
