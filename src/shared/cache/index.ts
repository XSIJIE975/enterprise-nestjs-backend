/**
 * 缓存模块统一导出
 *
 * 使用方式：
 * - 通用缓存：import { CacheService } from '@/shared/cache'
 * - RBAC 缓存：import { RbacCacheService } from '@/shared/cache'
 */

// 模块
export { CacheModule } from './cache.module';

// 服务
export { CacheService } from './cache.service';
export { RbacCacheService } from './business/rbac-cache.service';

// 接口（仅供类型定义）
export { ICacheService } from './interfaces/cache.interface';
