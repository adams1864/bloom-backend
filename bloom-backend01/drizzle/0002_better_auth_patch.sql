-- Reset Better Auth tables to align with current schema expectations.
-- WARNING: This migration drops existing Better Auth tables and recreates them.

DROP TABLE IF EXISTS `email_verifications`;
DROP TABLE IF EXISTS `accounts`;
DROP TABLE IF EXISTS `user_sessions`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(64) NOT NULL,
  `email` varchar(191) NOT NULL,
  `email_verified` tinyint(1) DEFAULT 0,
  `password_hash` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
);

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `token` varchar(191) NOT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `last_active` timestamp NULL DEFAULT NULL,
  `ip_address` varchar(191) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_sessions_user_idx` (`user_id`),
  UNIQUE KEY `user_sessions_token_unique` (`token`)
);

CREATE TABLE IF NOT EXISTS `accounts` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `provider_id` varchar(64) NOT NULL,
  `account_id` varchar(128) NOT NULL,
  `access_token` varchar(512) DEFAULT NULL,
  `refresh_token` varchar(512) DEFAULT NULL,
  `access_token_expires_at` timestamp NULL DEFAULT NULL,
  `refresh_token_expires_at` timestamp NULL DEFAULT NULL,
  `scope` varchar(255) DEFAULT NULL,
  `id_token` varchar(512) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `accounts_provider_account_unique` (`provider_id`, `account_id`),
  KEY `accounts_user_idx` (`user_id`)
);

CREATE TABLE IF NOT EXISTS `email_verifications` (
  `id` varchar(64) NOT NULL,
  `identifier` varchar(191) NOT NULL,
  `value` varchar(255) NOT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `email_verifications_identifier_idx` (`identifier`)
);
