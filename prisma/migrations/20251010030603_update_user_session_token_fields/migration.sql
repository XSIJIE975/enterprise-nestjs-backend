-- DropIndex
DROP INDEX `user_sessions_accessToken_idx` ON `user_sessions`;

-- DropIndex
DROP INDEX `user_sessions_refreshToken_idx` ON `user_sessions`;

-- AlterTable
ALTER TABLE `user_sessions` MODIFY `accessToken` TEXT NOT NULL,
    MODIFY `refreshToken` TEXT NOT NULL,
    MODIFY `deviceInfo` TEXT NULL,
    MODIFY `userAgent` TEXT NULL;

-- CreateIndex
CREATE INDEX `user_sessions_accessToken_idx` ON `user_sessions`(`accessToken`(255));

-- CreateIndex
CREATE INDEX `user_sessions_refreshToken_idx` ON `user_sessions`(`refreshToken`(255));
