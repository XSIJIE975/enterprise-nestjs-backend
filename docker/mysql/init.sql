-- ============================================================================
-- 企业级 NestJS 后端系统 - MySQL 数据库初始化脚本
-- ============================================================================

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 设置时区为东八区 (Asia/Shanghai)
SET GLOBAL time_zone = '+08:00';
SET SESSION time_zone = '+08:00';

-- 显示当前时区设置
SELECT @@global.time_zone AS global_timezone, @@session.time_zone AS session_timezone, NOW() AS current_datetime;

-- 创建测试数据库
CREATE DATABASE IF NOT EXISTS `enterprise_db_test` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 授权用户访问测试数据库
GRANT ALL PRIVILEGES ON `enterprise_db_test`.* TO 'app_user'@'%';

-- 授权用户创建和删除数据库权限（用于 Prisma Shadow Database）
GRANT CREATE ON *.* TO 'app_user'@'%';
GRANT DROP ON *.* TO 'app_user'@'%';
GRANT REFERENCES ON *.* TO 'app_user'@'%';
GRANT INDEX ON *.* TO 'app_user'@'%';
GRANT ALTER ON *.* TO 'app_user'@'%';

-- 授权用户访问主数据库的所有权限
GRANT ALL PRIVILEGES ON `enterprise_db`.* TO 'app_user'@'%';

-- 授权用户访问 Prisma shadow 数据库权限（通配符匹配）
GRANT ALL PRIVILEGES ON `prisma_migrate_shadow_db_%`.* TO 'app_user'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

-- 显示创建的数据库
SHOW DATABASES;

-- 显示用户权限
SHOW GRANTS FOR 'app_user'@'%';

-- 显示时区确认
SELECT 
    @@global.time_zone AS '全局时区',
    @@session.time_zone AS '会话时区', 
    NOW() AS '当前时间',
    UNIX_TIMESTAMP(NOW()) AS '时间戳';

COMMIT;