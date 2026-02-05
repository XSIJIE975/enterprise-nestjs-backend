-- DropIndex
DROP INDEX `user_sessions_accessToken_idx` ON `user_sessions`;

-- DropIndex
DROP INDEX `user_sessions_refreshToken_idx` ON `user_sessions`;

-- AlterTable
ALTER TABLE `audit_logs` ADD COLUMN `requestId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `audit_logs_requestId_idx` ON `audit_logs`(`requestId`);

-- CreateIndex
CREATE INDEX `user_sessions_accessToken_idx` ON `user_sessions`(`accessToken`(255));

-- CreateIndex
CREATE INDEX `user_sessions_refreshToken_idx` ON `user_sessions`(`refreshToken`(255));
