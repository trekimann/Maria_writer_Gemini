-- AlterTable: expand users for full profile page support
ALTER TABLE `users`
    ADD COLUMN `aliases` VARCHAR(1000) NULL,
    ADD COLUMN `bio` TEXT NULL,
    ADD COLUMN `creator_connections` JSON NULL,
    ADD COLUMN `dob` VARCHAR(50) NULL,
    ADD COLUMN `profile_color` VARCHAR(20) NULL;
