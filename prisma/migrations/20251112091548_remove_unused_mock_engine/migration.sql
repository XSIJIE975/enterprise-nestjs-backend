/*
  Warnings:

  - The values [HANDLEBARS] on the enum `mock_endpoints_templateEngine` will be removed. If these variants are still used in the database, this will fail.

*/
-- DropIndex
DROP INDEX `user_sessions_accessToken_idx` ON `user_sessions`;

-- DropIndex
DROP INDEX `user_sessions_refreshToken_idx` ON `user_sessions`;

-- AlterTable
ALTER TABLE `mock_endpoints` MODIFY `templateEngine` ENUM('MOCKJS', 'JSON') NOT NULL DEFAULT 'MOCKJS';

-- CreateIndex
CREATE INDEX `user_sessions_accessToken_idx` ON `user_sessions`(`accessToken`(255));

-- CreateIndex
CREATE INDEX `user_sessions_refreshToken_idx` ON `user_sessions`(`refreshToken`(255));
