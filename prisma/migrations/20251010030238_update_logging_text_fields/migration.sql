-- AlterTable
ALTER TABLE `api_logs` MODIFY `url` TEXT NOT NULL,
    MODIFY `userAgent` TEXT NULL,
    MODIFY `error` TEXT NULL;

-- AlterTable
ALTER TABLE `audit_logs` MODIFY `userAgent` TEXT NULL;

-- AlterTable
ALTER TABLE `error_logs` MODIFY `message` TEXT NOT NULL,
    MODIFY `stack` TEXT NULL;
