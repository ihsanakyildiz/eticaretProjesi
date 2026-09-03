ALTER TABLE `product_review_images`
  ADD CONSTRAINT `product_review_images_reviewId_fkey`
  FOREIGN KEY (`reviewId`) REFERENCES `product_reviews`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
