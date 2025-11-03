# 缓存系统使用指南

> 📌 **维护者**: XSIJIE | **最后更新**: 2025-11-03

> 完整的 Redis 缓存、内存缓存和 RBAC 权限缓存指南

---

## 📋 目录

1. [系统概述](#系统概述)
2. [架构设计](#架构设计)
3. [快速开始](#快速开始)
4. [缓存服务使用](#缓存服务使用)
5. [RBAC 缓存使用](#rbac-缓存使用)
6. [配置说明](#配置说明)
7. [最佳实践](#最佳实践)
8. [常见问题](#常见问题)
9. [API 参考](#api-参考)

---

## 系统概述

本系统实现了完整的缓存解决方案，包括以下功能：

- **Redis 缓存**：生产环境使用，支持分布式部署
- **内存缓存**：开发环境使用，基于 LRU Cache
- **RBAC 缓存**：专门处理角色权限缓存，支持批量失效
- **自动降级**：Redis 不可用时自动切换到内存缓存
- **反向索引**：高效的批量缓存失效机制

### 核心特性

✅ **统一接口**：所有缓存实现遵循 `ICacheService` 接口  
✅ **环境适配**：根据 `CACHE_TYPE` 自动选择 Redis 或内存缓存  
✅ **向后兼容**：保留 `CacheService` 适配器，无需修改现有代码  
✅ **业务隔离**：RBAC 缓存独立封装，逻辑清晰  
✅ **批量失效**：角色权限变更时批量清除用户缓存

---

## 架构设计

### 三层架构

```text
┌─────────────────────────────────────────┐
│  业务层 (Business Layer)                │
│  ├─ CacheService (通用缓存适配器)       │
│  └─ RbacCacheService (RBAC 专用缓存)    │
└─────────────────┬───────────────────────┘
                  │ 依赖
┌─────────────────┴───────────────────────┐
│  实现层 (Implementation Layer)          │
│  ├─ RedisCacheService (Redis 实现)      │
│  └─ MemoryCacheService (内存实现)       │
└─────────────────┬───────────────────────┘
                  │ 实现
┌─────────────────┴───────────────────────┐
│  接口层 (Interface Layer)               │
│  └─ ICacheService (统一缓存接口)        │
└─────────────────────────────────────────┘
```

### 目录结构

```text
src/shared/cache/
├── interfaces/
│   └── cache.interface.ts              # 缓存接口定义
├── implementations/
│   ├── redis-cache.service.ts          # Redis 实现
│   └── memory-cache.service.ts         # 内存实现（LRU Cache）
├── business/
│   └── rbac-cache.service.ts           # RBAC 缓存服务
├── cache.module.ts                     # 缓存模块
├── cache.service.ts                    # 通用缓存适配器
└── index.ts                            # 统一导出
```

### 环境策略

| 环境     | Redis 可用 | 降级策略 | RBAC 缓存        |
| -------- | ---------- | -------- | ---------------- |
| **生产** | 必须       | 启动失败 | 强制 Redis       |
| **开发** | 推荐       | 内存缓存 | 降级内存（警告） |
| **测试** | 可选       | 内存缓存 | 内存缓存         |

---

## 快速开始

### 1. 环境配置

在 `.env` 文件中配置缓存类型和 Redis 连接：

```env
# 缓存类型
CACHE_TYPE=auto              # redis | memory | auto（默认）

# Redis 配置（CACHE_TYPE 为 redis 或 auto 时需要）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=nestjs:

# 环境
NODE_ENV=development         # production | development | test
```

**CACHE_TYPE 说明：**

- `redis`：强制使用 Redis，连接失败则降级为内存缓存
- `memory`：强制使用内存缓存（不连接 Redis）
- `auto`：自动选择，优先 Redis，失败时降级（**推荐**）

### 2. 导入缓存模块

在 `app.module.ts` 中导入（已自动配置为全局模块）：

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from './shared/cache/cache.module';

@Module({
  imports: [
    CacheModule, // 已标记为 @Global()，无需在其他模块重复导入
    // ...其他模块
  ],
})
export class AppModule {}
```

### 3. 使用缓存服务

在任意服务中注入使用：

```typescript
import { Injectable } from '@nestjs/common';
import { CacheService, RbacCacheService } from '@/shared/cache';

@Injectable()
export class YourService {
  constructor(
    private readonly cacheService: CacheService, // 通用缓存
    private readonly rbacCacheService: RbacCacheService, // RBAC 缓存
  ) {}

  async someMethod() {
    // 使用通用缓存
    await this.cacheService.set('key', 'value', 3600);
    const value = await this.cacheService.get('key');

    // 使用 RBAC 缓存
    await this.rbacCacheService.setUserRoles(userId, ['admin', 'user']);
    const roles = await this.rbacCacheService.getUserRoles(userId);
  }
}
```

---

## 缓存服务使用

### 基础操作

#### 设置缓存

```typescript
// 设置缓存，默认无过期时间
await cacheService.set('user:profile:123', userProfile);

// 设置缓存，60 秒后过期
await cacheService.set('session:abc', sessionData, 60);

// 设置缓存，1 小时后过期
await cacheService.set('config:app', config, 3600);
```

#### 获取缓存

```typescript
// 获取缓存值
const profile = await cacheService.get<UserProfile>('user:profile:123');

if (!profile) {
  // 缓存未命中，从数据库加载
  const dbProfile = await this.loadFromDatabase(123);
  await cacheService.set('user:profile:123', dbProfile, 3600);
}
```

#### 删除缓存

```typescript
// 删除单个键
await cacheService.del('user:profile:123');

// 按模式删除（支持通配符）
await cacheService.delPattern('user:*'); // 删除所有 user: 开头的键
await cacheService.delPattern('session:*'); // 删除所有 session: 开头的键
```

### 高级操作

#### 缓存未命中时自动加载

```typescript
const profile = await cacheService.getOrSet(
  'user:profile:123',
  async () => {
    // 缓存未命中时的数据加载逻辑
    return await this.prisma.user.findUnique({ where: { id: 123 } });
  },
  3600, // TTL: 1 小时
);
```

#### 批量操作

```typescript
// 批量获取
const values = await cacheService.mget(['key1', 'key2', 'key3']);

// 批量设置
await cacheService.mset({
  key1: 'value1',
  key2: 'value2',
  key3: 'value3',
});
```

#### 计数器操作

```typescript
// 递增
const count = await cacheService.incr('api:calls:count');

// 递减
const remaining = await cacheService.decr('rate:limit:remaining');
```

#### 集合操作

```typescript
// 添加到集合
await cacheService.sadd('online:users', '123', '456');

// 获取集合成员
const users = await cacheService.smembers('online:users');

// 从集合移除
await cacheService.srem('online:users', '123');
```

#### 过期时间管理

```typescript
// 检查键是否存在
const exists = await cacheService.exists('user:session:abc');

// 获取剩余过期时间（秒）
const ttl = await cacheService.ttl('user:session:abc');

// 更新过期时间
await cacheService.expire('user:session:abc', 1800); // 延长到 30 分钟
```

### 缓存键命名规范

使用 `generateKey` 方法生成规范的缓存键：

```typescript
// 推荐：使用 generateKey
const key = cacheService.generateKey('user', 'profile', userId);
// 结果: "user:profile:123"

const sessionKey = cacheService.generateKey('session', sessionId);
// 结果: "session:abc-def-123"

// 不推荐：手动拼接
const key = `user:profile:${userId}`; // 容易出错
```

**命名约定：**

```text
user:profile:{userId}           # 用户资料
user:roles:{userId}             # 用户角色
user:permissions:{userId}       # 用户权限
session:{sessionId}             # 会话数据
token:blacklist:{token}         # Token 黑名单
config:app                      # 应用配置
api:rate:limit:{userId}         # API 限流计数
```

---

## RBAC 缓存使用

`RbacCacheService` 专门处理角色和权限缓存，支持反向索引和批量失效。

### 用户角色缓存

#### 设置用户角色

```typescript
import { RbacCacheService } from '@/shared/cache';

@Injectable()
export class AuthService {
  constructor(private readonly rbacCacheService: RbacCacheService) {}

  async login(user: User) {
    const roles = user.userRoles.map(ur => ur.role.code);

    // 设置用户角色缓存（自动维护反向索引）
    await this.rbacCacheService.setUserRoles(user.id, roles, 3600);

    return { accessToken: '...' };
  }
}
```

#### 获取用户角色

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly rbacCacheService: RbacCacheService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userId = context.switchToHttp().getRequest().user.id;

    // 1. 尝试从缓存获取
    let userRoles = await this.rbacCacheService.getUserRoles(userId);

    // 2. 缓存未命中，查询数据库
    if (!userRoles) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { userRoles: { include: { role: true } } },
      });
      userRoles = dbUser.userRoles.map(ur => ur.role.code);

      // 3. 回写缓存
      await this.rbacCacheService.setUserRoles(userId, userRoles);
    }

    // 4. 验证权限
    return requiredRoles.some(role => userRoles.includes(role));
  }
}
```

### 用户权限缓存

#### 设置用户权限

```typescript
@Injectable()
export class AuthService {
  constructor(private readonly rbacCacheService: RbacCacheService) {}

  async login(user: User) {
    const permissions = this.aggregatePermissions(user);

    // 设置用户权限缓存（自动维护反向索引）
    await this.rbacCacheService.setUserPermissions(user.id, permissions, 3600);

    return { accessToken: '...' };
  }
}
```

#### 获取用户权限

```typescript
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly rbacCacheService: RbacCacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userId = context.switchToHttp().getRequest().user.id;

    // 从缓存获取权限
    let permissions = await this.rbacCacheService.getUserPermissions(userId);

    if (!permissions) {
      // 缓存未命中，从数据库加载
      permissions = await this.loadPermissionsFromDB(userId);
      await this.rbacCacheService.setUserPermissions(userId, permissions);
    }

    return this.checkPermissions(permissions, requiredPermissions);
  }
}
```

### 批量缓存失效

当角色或权限变更时，需要批量清除相关用户的缓存。

#### 角色权限变更

```typescript
@Injectable()
export class RolesService {
  constructor(
    private readonly rbacCacheService: RbacCacheService,
    private readonly prisma: PrismaService,
  ) {}

  async updateRolePermissions(roleId: number, permissionIds: number[]) {
    // 1. 更新数据库
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    await this.prisma.rolePermission.createMany({
      data: permissionIds.map(pid => ({ roleId, permissionId: pid })),
    });

    // 2. 获取角色代码
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });

    // 3. 批量清除拥有该角色的用户缓存
    const clearedCount = await this.rbacCacheService.invalidateRoleUsers(
      role.code,
    );

    this.logger.log(
      `角色 ${role.code} 权限变更，已清除 ${clearedCount} 个用户缓存`,
    );
  }
}
```

#### 删除角色

```typescript
async deleteRole(roleId: number) {
  const role = await this.prisma.role.findUnique({ where: { id: roleId } });

  // 先清除缓存（批量失效）
  await this.rbacCacheService.invalidateRoleUsers(role.code);

  // 再删除数据库记录
  await this.prisma.role.delete({ where: { id: roleId } });
}
```

#### 删除权限

```typescript
async deletePermission(permissionId: number) {
  const permission = await this.prisma.permission.findUnique({
    where: { id: permissionId },
  });

  // 批量清除拥有该权限的用户缓存
  await this.rbacCacheService.invalidatePermissionUsers(permission.code);

  // 删除数据库记录
  await this.prisma.permission.delete({ where: { id: permissionId } });
}
```

#### 批量清除多个角色

```typescript
async updateMultipleRoles(roleIds: number[]) {
  const roles = await this.prisma.role.findMany({
    where: { id: { in: roleIds } },
  });

  const roleCodes = roles.map(r => r.code);

  // 批量清除多个角色的用户缓存
  const clearedCount = await this.rbacCacheService.invalidateMultipleRoles(roleCodes);

  this.logger.log(`批量清除 ${roleCodes.length} 个角色，共 ${clearedCount} 个用户缓存`);
}
```

### 删除用户缓存

```typescript
async deleteUserCache(userId: number) {
  // 删除用户的角色和权限缓存（自动清理反向索引）
  await this.rbacCacheService.deleteUserCache(userId);
}
```

### 清空所有 RBAC 缓存

```typescript
// ⚠️ 慎用，仅用于紧急情况
async flushAllRbacCache() {
  await this.rbacCacheService.flushAllRbacCache();
  this.logger.warn('已清空所有 RBAC 缓存');
}
```

---

## 配置说明

### 环境变量

在 `.env` 文件中配置：

```env
# 缓存类型配置
CACHE_TYPE=auto                # redis | memory | auto（默认）

# Redis 配置
REDIS_HOST=localhost           # Redis 主机地址
REDIS_PORT=6379                # Redis 端口
REDIS_PASSWORD=                # Redis 密码（可选）
REDIS_DB=0                     # Redis 数据库索引
REDIS_KEY_PREFIX=nestjs:       # 键前缀

# 环境标识
NODE_ENV=development           # production | development | test
```

### CACHE_TYPE 详解

| 值       | 行为                                                   | 适用场景           |
| -------- | ------------------------------------------------------ | ------------------ |
| `redis`  | 强制使用 Redis，连接失败则降级为内存缓存               | 生产环境（推荐）   |
| `memory` | 强制使用内存缓存，不连接 Redis                         | 开发环境、单元测试 |
| `auto`   | 自动选择，优先 Redis，失败时降级为内存缓存（**默认**） | 所有环境（推荐）   |

### 各环境推荐配置

#### 生产环境 (.env.production)

```env
CACHE_TYPE=redis               # 强制 Redis（降级警告）
NODE_ENV=production
REDIS_HOST=redis-server
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

#### 开发环境 (.env.development)

```env
CACHE_TYPE=auto                # 自动选择（优先 Redis）
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### 测试环境 (.env.test)

```env
CACHE_TYPE=memory              # 强制内存缓存（快速测试）
NODE_ENV=test
```

### 缓存 TTL 建议

```typescript
// RBAC 数据：1 小时（经常变更）
await rbacCacheService.setUserRoles(userId, roles, 3600);

// 用户基本信息：4 小时（不常变更）
await cacheService.set('user:profile:' + userId, profile, 14400);

// 配置数据：1 天（几乎不变）
await cacheService.set('config:app', config, 86400);

// 会话数据：15 分钟（与 JWT 一致）
await cacheService.set('session:' + sessionId, session, 900);

// Token 黑名单：7 天（与 Refresh Token 一致）
await cacheService.set('token:blacklist:' + token, reason, 604800);
```

---

## 最佳实践

### 1. 缓存键命名规范

✅ **推荐做法：**

```typescript
// 使用 generateKey 生成键
const key = cacheService.generateKey('user', 'roles', userId);
// 结果: "user:roles:123"

// 清晰的层级结构
user:profile:{userId}           # 用户资料
user:roles:{userId}             # 用户角色
role:users:{roleCode}           # 角色的用户反向索引
```

❌ **不推荐做法：**

```typescript
// 手动拼接，容易出错
const key = `user_${userId}_profile`;

// 没有层级结构
const key = `userprofile${userId}`;
```

### 2. 缓存更新策略

✅ **推荐：删除缓存，让下次请求重新加载**

```typescript
async updateUser(userId: number, updateDto: UpdateUserDto) {
  // 1. 更新数据库
  await this.prisma.user.update({
    where: { id: userId },
    data: updateDto,
  });

  // 2. 删除缓存（推荐）
  await this.cacheService.del(`user:profile:${userId}`);
}
```

❌ **不推荐：直接更新缓存（可能与数据库不一致）**

```typescript
async updateUser(userId: number, updateDto: UpdateUserDto) {
  // 更新数据库
  const user = await this.prisma.user.update({
    where: { id: userId },
    data: updateDto,
  });

  // ❌ 直接更新缓存（如果数据库更新失败，缓存会不一致）
  await this.cacheService.set(`user:profile:${userId}`, user);
}
```

### 3. 缓存穿透防护

```typescript
async getUserProfile(userId: number) {
  const cacheKey = `user:profile:${userId}`;

  // 1. 尝试从缓存获取
  let profile = await this.cacheService.get(cacheKey);

  if (!profile) {
    // 2. 缓存未命中，查询数据库
    profile = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!profile) {
      // 3. 数据库也不存在，缓存空值（防止缓存穿透）
      await this.cacheService.set(cacheKey, null, 60);  // 缓存 1 分钟
      throw new NotFoundException('用户不存在');
    }

    // 4. 回写缓存
    await this.cacheService.set(cacheKey, profile, 3600);
  }

  return profile;
}
```

### 4. 批量处理避免阻塞

```typescript
// RbacCacheService 已内置分批处理
async invalidateRoleUsers(roleCode: string): Promise<number> {
  const userIds = await this.cacheService.smembers(`role:users:${roleCode}`);

  // 分批处理，每批 100 个
  const batchSize = 100;
  let clearedCount = 0;

  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    await Promise.all(
      batch.map(userId => this.deleteUserCache(Number(userId))),
    );
    clearedCount += batch.length;
    this.logger.debug(`已清除 ${clearedCount}/${userIds.length} 个用户缓存`);
  }

  return clearedCount;
}
```

### 5. 错误处理和降级

```typescript
async getUserRoles(userId: number): Promise<string[]> {
  try {
    // 尝试从缓存获取
    const roles = await this.rbacCacheService.getUserRoles(userId);
    if (roles) return roles;

    // 缓存未命中，查询数据库
    const dbRoles = await this.loadRolesFromDatabase(userId);
    await this.rbacCacheService.setUserRoles(userId, dbRoles);
    return dbRoles;
  } catch (error) {
    // 缓存服务异常，降级到直接查询数据库
    this.logger.error('缓存服务异常，降级处理', error);
    return await this.loadRolesFromDatabase(userId);
  }
}
```

### 6. 避免缓存雪崩

```typescript
// 为不同数据设置不同的 TTL，避免同时过期
const ttl = 3600 + Math.floor(Math.random() * 300); // 3600~3900 秒
await this.cacheService.set(key, value, ttl);
```

---

## 常见问题

### 1. 内存缓存在分布式环境下数据不一致

**问题**：多个应用实例的缓存数据不同步

**原因**：内存缓存是进程级别的，每个实例独立

**解决方案**：

```env
# 生产环境最好使用 Redis
CACHE_TYPE=redis
NODE_ENV=production
```

### 2. 角色变更后用户权限未更新

**问题**：更新角色权限后，用户仍然拥有旧权限

**原因**：缓存未失效

**解决方案**：

```typescript
// 确保在角色变更后清除缓存
await this.rbacCacheService.invalidateRoleUsers(roleCode);
```

### 3. 缓存未命中率过高

**问题**：频繁查询数据库，缓存效果不佳

**可能原因**：

- TTL 设置过短
- 缓存频繁失效
- 反向索引维护不当

**解决方案**：

```typescript
// 1. 适当延长 TTL
await this.rbacCacheService.setUserRoles(userId, roles, 7200); // 2 小时

// 2. 检查缓存命中率
const stats = await this.rbacCacheService.getCacheStats();
console.log('缓存类型:', stats.type);
console.log('缓存可用:', stats.available);

// 3. 确保 setUserRoles 被正确调用
this.logger.debug(`缓存用户 ${userId} 的角色`);
```

### 4. Redis 内存占用过高

**问题**：Redis 内存持续增长

**解决方案**：

```bash
# 1. 查看键数量
redis-cli DBSIZE

# 2. 查看键分布
redis-cli --scan --pattern "nestjs:*" | head -20

# 3. 设置合理的 TTL
await this.cacheService.set(key, value, 3600);  // 不要设置永久缓存

# 4. 定期清理过期数据（可选）
await this.cacheService.delPattern('old:pattern:*');
```

### 5. 如何查看缓存内容（调试）

```bash
# Redis 命令行
redis-cli

# 查看所有键
KEYS nestjs:*

# 查看特定键
GET nestjs:user:roles:123

# 查看集合成员
SMEMBERS nestjs:role:users:admin

# 查看 TTL
TTL nestjs:user:roles:123
```

---

## API 参考

### CacheService（通用缓存）

#### 基础操作

```typescript
// 获取缓存
get<T>(key: string): Promise<T | null>

// 设置缓存
set(key: string, value: any, ttl?: number): Promise<'OK' | null>

// 删除缓存
del(key: string): Promise<number>

// 按模式删除
delPattern(pattern: string): Promise<number>

// 检查键是否存在
exists(key: string): Promise<number>

// 获取剩余过期时间（秒）
ttl(key: string): Promise<number>

// 设置过期时间
expire(key: string, seconds: number): Promise<number>

// 清空所有缓存
flush(): Promise<'OK'>
```

#### 批量操作

```typescript
// 批量获取
mget(keys: string[]): Promise<(string | null)[]>

// 批量设置
mset(keyValuePairs: Record<string, any>): Promise<'OK'>
```

#### 计数器

```typescript
// 递增
incr(key: string): Promise<number>

// 递减
decr(key: string): Promise<number>
```

#### 集合操作

```typescript
// 添加元素到集合
sadd(key: string, ...members: string[]): Promise<number>

// 获取集合所有成员
smembers(key: string): Promise<string[]>

// 从集合移除元素
srem(key: string, ...members: string[]): Promise<number>
```

#### 辅助方法

```typescript
// 获取或设置（缓存未命中时调用 factory）
getOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  ttl?: number
): Promise<T>

// 生成缓存键
generateKey(prefix: string, ...parts: (string | number)[]): string

// 检查缓存是否可用
isAvailable(): boolean

// 获取缓存类型
getType(): 'redis' | 'memory'
```

### RbacCacheService（RBAC 缓存）

#### 用户角色操作

```typescript
// 获取用户角色
getUserRoles(userId: number): Promise<string[] | null>

// 设置用户角色（自动维护反向索引）
setUserRoles(
  userId: number,
  roles: string[],
  ttl?: number  // 默认 3600 秒
): Promise<void>
```

#### 用户权限操作

```typescript
// 获取用户权限
getUserPermissions(userId: number): Promise<string[] | null>

// 设置用户权限（自动维护反向索引）
setUserPermissions(
  userId: number,
  permissions: string[],
  ttl?: number  // 默认 3600 秒
): Promise<void>
```

#### 缓存失效操作

```typescript
// 删除用户的角色和权限缓存（自动清理反向索引）
deleteUserCache(userId: number): Promise<void>

// 批量失效拥有指定角色的用户缓存
invalidateRoleUsers(roleCode: string): Promise<number>

// 批量失效拥有指定权限的用户缓存
invalidatePermissionUsers(permissionCode: string): Promise<number>

// 批量失效多个角色的用户缓存
invalidateMultipleRoles(roleCodes: string[]): Promise<number>

// 清空所有 RBAC 缓存（⚠️ 慎用）
flushAllRbacCache(): Promise<void>
```

#### 状态检查

```typescript
// 检查 RBAC 缓存服务是否可用
isAvailable(): boolean

// 获取缓存统计信息（用于监控）
getCacheStats(): Promise<{
  type: string;
  available: boolean;
  userRolesCount: number;
  userPermissionsCount: number;
}>
```

---

## 监控与调试

### 日志输出

`RbacCacheService` 会自动输出关键操作日志：

```text
[RbacCacheService] ✅ 使用 Redis 缓存，支持分布式部署
[RbacCacheService] 缓存用户 123 的角色: admin, user
[RbacCacheService] 开始批量清除角色 admin 的 1500 个用户缓存
[RbacCacheService] 已清除 100/1500 个用户缓存
[RbacCacheService] 已清除 200/1500 个用户缓存
...
[RbacCacheService] 角色 admin 的用户缓存清除完成，共 1500 个
```

### 健康检查

```typescript
@Get('health/cache')
async checkCache() {
  const stats = await this.rbacCacheService.getCacheStats();

  if (!stats.available) {
    throw new ServiceUnavailableException('缓存服务不可用');
  }

  return {
    status: 'ok',
    type: stats.type,
    available: stats.available,
  };
}
```

### Redis 命令行调试

```bash
# 连接 Redis
redis-cli

# 统计 RBAC 缓存键数量
redis-cli --scan --pattern "nestjs:user:roles:*" | wc -l
redis-cli --scan --pattern "nestjs:role:users:*" | wc -l

# 查看特定用户的角色
GET nestjs:user:roles:123

# 查看角色的用户反向索引
SMEMBERS nestjs:role:users:admin

# 查看键的 TTL
TTL nestjs:user:roles:123
```

---

## 相关文档

- [系统架构概览](../architecture/overview.md)
- [日志系统使用指南](./logging.md)
- [认证授权模块](./authentication.md)

---
