import { Injectable, Inject } from '@nestjs/common';
import { ICacheService } from '../interfaces/cache.interface';
import { LoggerService } from '@/shared/logger/logger.service';

/**
 * RBAC 缓存服务
 * 专门处理角色和权限相关的缓存
 */
@Injectable()
export class RbacCacheService {
  private readonly USER_ROLES_PREFIX = 'user:roles';
  private readonly USER_PERMISSIONS_PREFIX = 'user:permissions';
  private readonly ROLE_USERS_PREFIX = 'role:users';
  private readonly PERMISSION_USERS_PREFIX = 'permission:users';
  private readonly DEFAULT_TTL = 3600; // 1小时

  constructor(
    @Inject('CACHE_SERVICE')
    private readonly cacheService: ICacheService,
    private readonly logger: LoggerService,
  ) {
    // 确保使用的是 Redis 缓存（生产环境）
    if (this.cacheService.getType() !== 'redis') {
      this.logger.warn(
        '⚠️ RbacCacheService 当前使用内存缓存，分布式环境下可能导致数据不一致',
        'RbacCacheService',
      );
    } else {
      this.logger.log(
        '✅ RbacCacheService 使用 Redis 缓存，支持分布式部署',
        'RbacCacheService',
      );
    }
  }

  /**
   * 获取用户的角色缓存
   */
  async getUserRoles(userId: string): Promise<string[] | null> {
    const key = this.cacheService.generateKey(this.USER_ROLES_PREFIX, userId);
    return await this.cacheService.get<string[]>(key);
  }

  /**
   * 设置用户的角色缓存
   */
  async setUserRoles(
    userId: string,
    roles: string[],
    ttl: number = this.DEFAULT_TTL,
  ): Promise<void> {
    const key = this.cacheService.generateKey(this.USER_ROLES_PREFIX, userId);
    await this.cacheService.set(key, roles, ttl);

    // 维护反向索引：角色 -> 用户列表
    for (const role of roles) {
      const roleUsersKey = this.cacheService.generateKey(
        this.ROLE_USERS_PREFIX,
        role,
      );
      await this.cacheService.sadd(roleUsersKey, userId.toString());
    }

    this.logger.debug(
      `缓存用户 ${userId} 的角色: ${roles.join(', ')}`,
      'RbacCacheService',
    );
  }

  /**
   * 获取用户的权限缓存
   */
  async getUserPermissions(userId: string): Promise<string[] | null> {
    const key = this.cacheService.generateKey(
      this.USER_PERMISSIONS_PREFIX,
      userId,
    );
    return await this.cacheService.get<string[]>(key);
  }

  /**
   * 设置用户的权限缓存
   */
  async setUserPermissions(
    userId: string,
    permissions: string[],
    ttl: number = this.DEFAULT_TTL,
  ): Promise<void> {
    const key = this.cacheService.generateKey(
      this.USER_PERMISSIONS_PREFIX,
      userId,
    );
    await this.cacheService.set(key, permissions, ttl);

    // 维护反向索引：权限 -> 用户列表
    for (const permission of permissions) {
      const permissionUsersKey = this.cacheService.generateKey(
        this.PERMISSION_USERS_PREFIX,
        permission,
      );
      await this.cacheService.sadd(permissionUsersKey, userId);
    }

    this.logger.debug(
      `缓存用户 ${userId} 的权限: ${permissions.join(', ')}`,
      'RbacCacheService',
    );
  }

  /**
   * 删除用户的角色和权限缓存
   */
  async deleteUserCache(userId: string): Promise<void> {
    // 先获取用户的角色和权限，以便清理反向索引
    const roles = await this.getUserRoles(userId);
    const permissions = await this.getUserPermissions(userId);

    // 删除用户的角色和权限缓存
    const userRolesKey = this.cacheService.generateKey(
      this.USER_ROLES_PREFIX,
      userId,
    );
    const userPermissionsKey = this.cacheService.generateKey(
      this.USER_PERMISSIONS_PREFIX,
      userId,
    );
    await this.cacheService.del(userRolesKey);
    await this.cacheService.del(userPermissionsKey);

    // 清理反向索引
    if (roles) {
      for (const role of roles) {
        const roleUsersKey = this.cacheService.generateKey(
          this.ROLE_USERS_PREFIX,
          role,
        );
        await this.cacheService.srem(roleUsersKey, userId.toString());
      }
    }

    if (permissions) {
      for (const permission of permissions) {
        const permissionUsersKey = this.cacheService.generateKey(
          this.PERMISSION_USERS_PREFIX,
          permission,
        );
        await this.cacheService.srem(permissionUsersKey, userId);
      }
    }

    this.logger.debug(`删除用户 ${userId} 的 RBAC 缓存`, 'RbacCacheService');
  }

  /**
   * 批量删除拥有指定角色的用户缓存
   * 用于角色权限变更时
   */
  async invalidateRoleUsers(roleCode: string): Promise<number> {
    const roleUsersKey = this.cacheService.generateKey(
      this.ROLE_USERS_PREFIX,
      roleCode,
    );
    const userIds = await this.cacheService.smembers(roleUsersKey);

    if (userIds.length === 0) {
      this.logger.debug(
        `角色 ${roleCode} 没有关联的用户缓存`,
        'RbacCacheService',
      );
      return 0;
    }

    this.logger.log(
      `开始批量清除角色 ${roleCode} 的 ${userIds.length} 个用户缓存`,
      'RbacCacheService',
    );

    // 分批处理，避免一次性操作过多
    const batchSize = 100;
    let clearedCount = 0;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      await Promise.all(batch.map(userId => this.deleteUserCache(userId)));
      clearedCount += batch.length;
      this.logger.debug(
        `已清除 ${clearedCount}/${userIds.length} 个用户缓存`,
        'RbacCacheService',
      );
    }

    // 清除反向索引
    await this.cacheService.del(roleUsersKey);

    this.logger.log(
      `角色 ${roleCode} 的用户缓存清除完成，共 ${clearedCount} 个`,
      'RbacCacheService',
    );
    return clearedCount;
  }

  /**
   * 批量删除拥有指定权限的用户缓存
   * 用于权限变更时
   */
  async invalidatePermissionUsers(permissionCode: string): Promise<number> {
    const permissionUsersKey = this.cacheService.generateKey(
      this.PERMISSION_USERS_PREFIX,
      permissionCode,
    );
    const userIds = await this.cacheService.smembers(permissionUsersKey);

    if (userIds.length === 0) {
      this.logger.debug(
        `权限 ${permissionCode} 没有关联的用户缓存`,
        'RbacCacheService',
      );
      return 0;
    }

    this.logger.log(
      `开始批量清除权限 ${permissionCode} 的 ${userIds.length} 个用户缓存`,
      'RbacCacheService',
    );

    // 分批处理
    const batchSize = 100;
    let clearedCount = 0;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      await Promise.all(batch.map(userId => this.deleteUserCache(userId)));
      clearedCount += batch.length;
      this.logger.debug(
        `已清除 ${clearedCount}/${userIds.length} 个用户缓存`,
        'RbacCacheService',
      );
    }

    // 清除反向索引
    await this.cacheService.del(permissionUsersKey);

    this.logger.log(
      `权限 ${permissionCode} 的用户缓存清除完成，共 ${clearedCount} 个`,
      'RbacCacheService',
    );
    return clearedCount;
  }

  /**
   * 批量删除多个角色的用户缓存
   */
  async invalidateMultipleRoles(roleCodes: string[]): Promise<number> {
    let totalCleared = 0;
    for (const roleCode of roleCodes) {
      const cleared = await this.invalidateRoleUsers(roleCode);
      totalCleared += cleared;
    }
    return totalCleared;
  }

  /**
   * 清空所有 RBAC 缓存
   * ⚠️ 慎用，仅用于紧急情况
   */
  async flushAllRbacCache(): Promise<void> {
    this.logger.warn('⚠️ 开始清空所有 RBAC 缓存', 'RbacCacheService');

    await this.cacheService.delPattern(`${this.USER_ROLES_PREFIX}:*`);
    await this.cacheService.delPattern(`${this.USER_PERMISSIONS_PREFIX}:*`);
    await this.cacheService.delPattern(`${this.ROLE_USERS_PREFIX}:*`);
    await this.cacheService.delPattern(`${this.PERMISSION_USERS_PREFIX}:*`);

    this.logger.warn('✅ 所有 RBAC 缓存已清空', 'RbacCacheService');
  }

  /**
   * 检查 RBAC 缓存服务是否可用
   */
  isAvailable(): boolean {
    return this.cacheService.isAvailable();
  }

  /**
   * 获取缓存统计信息（用于监控）
   */
  async getCacheStats(): Promise<{
    type: string;
    available: boolean;
    userRolesCount: number;
    userPermissionsCount: number;
  }> {
    // 这里可以扩展更详细的统计信息
    return {
      type: this.cacheService.getType(),
      available: this.cacheService.isAvailable(),
      userRolesCount: 0, // 可以通过 SCAN 命令统计
      userPermissionsCount: 0,
    };
  }
}
