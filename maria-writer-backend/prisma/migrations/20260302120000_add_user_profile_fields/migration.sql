-- AlterTable: add username, tier, genreTags, profilePicture to users
ALTER TABLE `users` ADD COLUMN `genre_tags` VARCHAR(1000) NULL,
    ADD COLUMN `profile_picture` LONGTEXT NULL,
    ADD COLUMN `tier` ENUM('DEFAULT') NOT NULL DEFAULT 'DEFAULT',
    ADD COLUMN `username` VARCHAR(64) NOT NULL DEFAULT '';

-- Backfill username from email prefix for any existing rows
UPDATE `users` SET `username` = CONCAT('user_', SUBSTRING(id, 1, 8)) WHERE `username` = '';

-- CreateIndex
CREATE UNIQUE INDEX `users_username_key` ON `users`(`username`);

-- CreateIndex
CREATE INDEX `users_username_idx` ON `users`(`username`);

-- Remove the default now that backfill is done
ALTER TABLE `users` ALTER COLUMN `username` DROP DEFAULT;
