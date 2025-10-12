CREATE TABLE `bundles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `status` varchar(50) DEFAULT 'unpublished',
  `cover_image` varchar(255) DEFAULT '',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `bundle_products` (
  `bundle_id` int NOT NULL,
  `product_id` int NOT NULL,
  PRIMARY KEY (`bundle_id`, `product_id`),
  KEY `bundle_products_bundle_idx` (`bundle_id`),
  KEY `bundle_products_product_idx` (`product_id`),
  CONSTRAINT `bundle_products_bundle_id_bundles_id_fk` FOREIGN KEY (`bundle_id`) REFERENCES `bundles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bundle_products_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
