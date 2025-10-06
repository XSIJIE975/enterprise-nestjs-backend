import { SetMetadata } from '@nestjs/common';

/**
 * 数据库日志控制装饰器
 */

// 元数据键
export const DATABASE_LOG_KEY = 'database_log';

/**
 * 启用数据库日志
 * 可用于 Controller 类或方法
 *
 * @example
 * ```typescript
 * @Controller('users')
 * @EnableDatabaseLog() // 整个 Controller 启用
 * export class UsersController {
 *   @Get()
 *   findAll() {} // 会记录到数据库
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Controller('users')
 * export class UsersController {
 *   @Get()
 *   @EnableDatabaseLog() // 只对这个方法启用
 *   findAll() {}
 * }
 * ```
 */
export const EnableDatabaseLog = () => SetMetadata(DATABASE_LOG_KEY, true);

/**
 * 禁用数据库日志
 * 优先级高于 EnableDatabaseLog 和全局配置
 * 用于在全局启用时排除特定接口
 *
 * @example
 * ```typescript
 * @Controller('health')
 * @DisableDatabaseLog() // 健康检查不记录数据库日志
 * export class HealthController {
 *   @Get()
 *   check() {}
 * }
 * ```
 */
export const DisableDatabaseLog = () => SetMetadata(DATABASE_LOG_KEY, false);
