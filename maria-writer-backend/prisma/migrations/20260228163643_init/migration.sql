-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(191) NOT NULL,
    `guest_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `data` JSON NOT NULL,
    `version` VARCHAR(10) NOT NULL DEFAULT '2.1',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `projects_guest_id_idx`(`guest_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
