-- CreateTable
CREATE TABLE `project_collaborators` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `role` ENUM('READ', 'COMMENT', 'EDIT') NOT NULL,
    `invited_by` VARCHAR(191) NOT NULL,
    `invited_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `accepted_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,

    UNIQUE INDEX `project_collaborators_project_id_user_id_key`(`project_id`, `user_id`),
    INDEX `project_collaborators_project_id_idx`(`project_id`),
    INDEX `project_collaborators_user_id_idx`(`user_id`),
    INDEX `project_collaborators_invited_by_idx`(`invited_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_invitations` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `role` ENUM('READ', 'COMMENT', 'EDIT') NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `invited_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `accepted_at` DATETIME(3) NULL,
    `declined_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,

    UNIQUE INDEX `project_invitations_token_key`(`token`),
    INDEX `project_invitations_project_id_idx`(`project_id`),
    INDEX `project_invitations_email_idx`(`email`),
    INDEX `project_invitations_token_idx`(`token`),
    INDEX `project_invitations_invited_by_idx`(`invited_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_review_comments` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `chapter_id` VARCHAR(191) NOT NULL,
    `author_id` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `is_suggestion` BOOLEAN NOT NULL DEFAULT false,
    `replacement_text` TEXT NULL,
    `original_text` TEXT NOT NULL,
    `start_offset` INTEGER NULL,
    `end_offset` INTEGER NULL,
    `status` ENUM('ACTIVE', 'RESOLVED', 'HIDDEN') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_review_comments_project_id_idx`(`project_id`),
    INDEX `project_review_comments_chapter_id_idx`(`chapter_id`),
    INDEX `project_review_comments_author_id_idx`(`author_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `project_collaborators` ADD CONSTRAINT `project_collaborators_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_collaborators` ADD CONSTRAINT `project_collaborators_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_collaborators` ADD CONSTRAINT `project_collaborators_invited_by_fkey` FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_invitations` ADD CONSTRAINT `project_invitations_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_invitations` ADD CONSTRAINT `project_invitations_invited_by_fkey` FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_review_comments` ADD CONSTRAINT `project_review_comments_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_review_comments` ADD CONSTRAINT `project_review_comments_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
