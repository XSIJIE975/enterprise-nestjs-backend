-- DropIndex
DROP INDEX `user_sessions_accessToken_idx` ON `user_sessions`;

-- DropIndex
DROP INDEX `user_sessions_refreshToken_idx` ON `user_sessions`;

-- CreateTable
CREATE TABLE `mock_endpoints` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `path` VARCHAR(255) NOT NULL,
    `method` ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL') NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `statusCode` INTEGER NOT NULL DEFAULT 200,
    `delay` INTEGER NOT NULL DEFAULT 0,
    `responseTemplate` TEXT NOT NULL,
    `templateEngine` ENUM('MOCKJS', 'HANDLEBARS', 'JSON') NOT NULL DEFAULT 'MOCKJS',
    `headers` TEXT NULL,
    `validation` TEXT NULL,
    `createdBy` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    INDEX `idx_path`(`path`(191)),
    INDEX `idx_enabled`(`enabled`),
    INDEX `idx_created_at`(`createdAt`),
    UNIQUE INDEX `mock_endpoints_path_method_key`(`path`(191), `method`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mock_logs` (
    `id` VARCHAR(191) NOT NULL,
    `endpointId` VARCHAR(50) NULL,
    `method` VARCHAR(10) NOT NULL,
    `path` VARCHAR(255) NOT NULL,
    `query` TEXT NULL,
    `body` TEXT NULL,
    `headers` TEXT NULL,
    `ip` VARCHAR(50) NULL,
    `response` TEXT NULL,
    `statusCode` INTEGER NOT NULL,
    `duration` INTEGER NOT NULL,
    `cacheHit` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_endpoint_id`(`endpointId`),
    INDEX `idx_created_at`(`createdAt`),
    INDEX `idx_path_method`(`path`(191), `method`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `user_sessions_accessToken_idx` ON `user_sessions`(`accessToken`(255));

-- CreateIndex
CREATE INDEX `user_sessions_refreshToken_idx` ON `user_sessions`(`refreshToken`(255));
