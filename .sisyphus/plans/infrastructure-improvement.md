# 项目基础设施改进工作计划

## Context

### Original Request

用户希望在增加新功能之前，先完善项目的基础设施，包括配置管理、安全加固、性能优化和弹性机制。

### Interview Summary

**Key Discussions**:

- 配置验证：使用 Zod，每文件独立验证，开发环境警告+生产环境退出
- 账户锁定：渐进式锁定（5次→15分钟，10次→1小时），独立计数，Redis 存储，不通知
- CSRF：全部 POST/PUT/DELETE，豁免 /health/_ 和 /mock/_
- Repository：覆盖 User/Role/Permission/Session，支持外部事务
- 弹性机制：Redis + 数据库，熔断时返回 503，重试 3次/100ms/2x 退避

**Research Findings**:

- 项目已有良好的缓存策略（Cache-First + Write-Through）
- 已有 Token 黑名单机制
- CSRF 配置存在但未启用
- 无账户锁定机制
- 无配置启动验证
- 无熔断器/重试装饰器

### Metis Review

**Identified Gaps** (addressed):

- 账户锁定竞态条件 → 使用 Redis INCR 原子操作
- 配置验证死锁 → 验证失败时用 console.error
- 熔断器误触发 → 使用失败率阈值
- CSRF Token 预检请求 → 自动跳过 OPTIONS
- 重试超时累积 → 设置总超时上限 10s

---

## Work Objectives

### Core Objective

增强 NestJS 企业级后端的基础设施，提升配置安全性、应用安全性、数据库性能和系统弹性。

### Concrete Deliverables

- `src/config/*.config.ts` - Zod 验证集成（9个配置文件）
- `src/shared/config/config-validator.ts` - 统一验证入口
- `src/common/guards/csrf.guard.ts` - CSRF 守卫
- `src/modules/auth/services/account-lockout.service.ts` - 账户锁定服务
- `src/shared/repositories/*.repository.ts` - 4个 Repository 类
- `src/shared/resilience/` - 熔断器和重试机制

### Definition of Done

- [ ] 启动时缺少 JWT_SECRET 等必需配置会阻止应用启动（生产环境）
- [ ] 5次密码错误后账户锁定15分钟
- [ ] 所有 POST/PUT/DELETE 路由受 CSRF 保护（除豁免路径）
- [ ] User/Role/Permission/Session 操作通过 Repository 进行
- [ ] Redis/数据库故障时触发熔断器，返回 503

### Must Have

- Zod 配置验证 + 类型推导
- 渐进式账户锁定 + Redis 原子操作
- CSRF 保护 + 路径豁免
- Repository 层 + 事务支持
- 熔断器 + 重试装饰器

### Must NOT Have (Guardrails)

- ❌ 不修改现有缓存刷新策略（deleteUserCache / 全量刷新）
- ❌ Repository 层不处理业务逻辑（密码哈希、权限检查等）
- ❌ 写操作默认不重试（需显式标记幂等）
- ❌ 配置验证不使用 LoggerService（避免循环依赖）
- ❌ 不修改现有 Prisma Client 导入路径（@/prisma/prisma/client）
- ❌ 熔断器打开时不返回陈旧数据
- ❌ 不做 IP 级别封禁（只做用户级别锁定）
- ❌ 不做配置热更新

---

## Verification Strategy (MANDATORY)

### Test Decision

- **Infrastructure exists**: YES (17个单元测试文件)
- **User wants tests**: NO (后续补充)
- **Framework**: bun test / jest

### Manual QA Only (for this iteration)

每个 TODO 包含详细的手动验证步骤，使用：

- **API 测试**: curl / Postman
- **日志验证**: 检查启动日志和运行日志
- **Redis 验证**: redis-cli 检查锁定状态

---

## Task Flow

```
Phase 1: 基础设施准备
  ├── TODO 1: Zod 配置验证 ─────────┐
  └── TODO 2-5: Repository 层 ──────┼──→ Phase 2
                                    │
Phase 2: 安全加固                   │
  ├── TODO 6: CSRF 保护 ←───────────┤
  └── TODO 7: 账户锁定 ←────────────┘
                    │
Phase 3: 弹性机制   ↓
  ├── TODO 8: 熔断器服务
  └── TODO 9: 重试装饰器
                    │
Phase 4: 性能优化   ↓
  └── TODO 10: N+1 查询修复
```

## Parallelization

| Group | Tasks      | Reason                  |
| ----- | ---------- | ----------------------- |
| A     | 2, 3, 4, 5 | 4个 Repository 相互独立 |
| B     | 6, 7       | CSRF 和账户锁定相互独立 |

| Task | Depends On | Reason                       |
| ---- | ---------- | ---------------------------- |
| 6, 7 | 1          | 需要配置验证就绪             |
| 8, 9 | 2-5        | 熔断器需要与 Repository 集成 |
| 10   | 2-5        | N+1 修复在 Repository 中进行 |

---

## TODOs

### Phase 1: 基础设施准备

- [x] 1. 添加 Zod 配置验证

  **What to do**:
  - 安装 zod 依赖：`pnpm add zod`
  - 为每个配置文件创建 Zod schema
  - 创建统一验证入口 `src/shared/config/config-validator.ts`
  - 在 `src/main.ts` 启动时调用验证
  - 开发环境验证失败仅警告，生产环境 process.exit(1)

  **Must NOT do**:
  - 不使用 LoggerService 记录验证失败（避免循环依赖）
  - 不修改现有 ConfigModule 加载顺序

  **Parallelizable**: NO (基础依赖)

  **References**:

  **Pattern References**:
  - `src/config/app.config.ts:1-50` - 现有配置模式，registerAs() 用法
  - `src/config/security.config.ts:15-25` - 边界验证示例（MAX_CONCURRENT_SESSIONS）

  **API/Type References**:
  - `src/config/index.ts` - 所有配置导出入口

  **External References**:
  - Zod 官方文档: https://zod.dev/?id=basic-usage

  **Acceptance Criteria**:

  **Manual Verification**:
  - [ ] 删除 .env 中的 JWT_ACCESS_SECRET，启动应用
    - 开发环境：应看到警告日志，应用继续启动
    - 生产环境（NODE_ENV=production）：应看到错误并退出
  - [ ] 设置 JWT_ACCESS_SECRET 为少于 32 字符的值
    - 应触发验证错误：`JWT_ACCESS_SECRET must be at least 32 characters`
  - [ ] 正常配置启动，检查启动日志
    - 应看到：`✅ Configuration validated successfully`

  **Commit**: YES
  - Message: `feat(config): add Zod validation for all configuration files`
  - Files: `src/config/*.config.ts`, `src/shared/config/config-validator.ts`, `src/main.ts`
  - Pre-commit: `pnpm type-check`

---

- [x] 2. 创建 UserRepository

  **What to do**:
  - 创建 `src/shared/repositories/user.repository.ts`
  - 创建 `src/shared/repositories/interfaces/user-repository.interface.ts`
  - 实现 CRUD 方法，支持可选事务参数
  - 处理 PrismaClientKnownRequestError（唯一约束冲突等）
  - 默认过滤软删除记录（deletedAt IS NULL）
  - 创建 RepositoriesModule 并导出

  **Must NOT do**:
  - 不处理密码哈希（业务逻辑留在 Service）
  - 不在 Repository 间相互调用
  - 不包含缓存逻辑

  **Parallelizable**: YES (with 3, 4, 5)

  **References**:

  **Pattern References**:
  - `src/modules/users/users.service.ts:46-108` - 现有用户 CRUD 逻辑
  - `src/shared/database/prisma.service.ts` - PrismaService 用法
  - `src/modules/roles/roles.service.ts:264-297` - 事务使用示例

  **API/Type References**:
  - `prisma/models/auth.prisma` - User 模型定义
  - `src/modules/users/dto/*.dto.ts` - 用户相关 DTO

  **Acceptance Criteria**:

  **Manual Verification**:
  - [ ] 在测试控制器中调用 `userRepository.findById(id)`
    - 返回用户对象，不含 deletedAt 不为 null 的记录
  - [ ] 调用 `userRepository.create()` 传入重复邮箱
    - 抛出 ConflictException，消息包含"邮箱已存在"
  - [ ] 在事务中调用 `userRepository.create(data, tx)`
    - 事务回滚时用户未创建

  **Commit**: YES
  - Message: `feat(repository): add UserRepository with transaction support`
  - Files: `src/shared/repositories/user.repository.ts`, `src/shared/repositories/interfaces/*`, `src/shared/repositories/repositories.module.ts`
  - Pre-commit: `pnpm type-check`

---

- [x] 3. 创建 RoleRepository

  **What to do**:
  - 创建 `src/shared/repositories/role.repository.ts`
  - 实现 CRUD + 权限分配相关方法
  - 支持可选事务参数
  - 注册到 RepositoriesModule

  **Must NOT do**:
  - 不调用 RbacCacheService（缓存刷新留在 Service）
  - 不在 Repository 间相互调用

  **Parallelizable**: YES (with 2, 4, 5)

  **References**:

  **Pattern References**:
  - `src/modules/roles/roles.service.ts:37-140` - 现有角色 CRUD 逻辑
  - `src/modules/roles/roles.service.ts:339-398` - 权限分配逻辑

  **API/Type References**:
  - `prisma/models/rbac.prisma` - Role/RolePermission 模型定义

  **Acceptance Criteria**:

  **Manual Verification**:
  - [ ] 调用 `roleRepository.findByCode('admin')`
    - 返回管理员角色对象
  - [ ] 调用 `roleRepository.create()` 传入重复 code
    - 抛出 ConflictException

  **Commit**: YES
  - Message: `feat(repository): add RoleRepository with transaction support`
  - Files: `src/shared/repositories/role.repository.ts`
  - Pre-commit: `pnpm type-check`

---

- [x] 4. 创建 PermissionRepository

  **What to do**:
  - 创建 `src/shared/repositories/permission.repository.ts`
  - 实现 CRUD 方法
  - 支持可选事务参数
  - 注册到 RepositoriesModule

  **Must NOT do**:
  - 不在 Repository 间相互调用

  **Parallelizable**: YES (with 2, 3, 5)

  **References**:

  **Pattern References**:
  - `src/modules/permissions/permissions.service.ts` - 现有权限 CRUD 逻辑

  **API/Type References**:
  - `prisma/models/rbac.prisma` - Permission 模型定义

  **Acceptance Criteria**:

  **Manual Verification**:
  - [ ] 调用 `permissionRepository.findAll()`
    - 返回所有权限列表

  **Commit**: YES
  - Message: `feat(repository): add PermissionRepository with transaction support`
  - Files: `src/shared/repositories/permission.repository.ts`
  - Pre-commit: `pnpm type-check`

---

- [x] 5. 创建 SessionRepository

  **What to do**:
  - 创建 `src/shared/repositories/session.repository.ts`
  - 实现会话 CRUD + 批量撤销方法
  - 支持可选事务参数
  - 注册到 RepositoriesModule

  **Must NOT do**:
  - 不处理 Token 黑名单逻辑（留在 AuthService）

  **Parallelizable**: YES (with 2, 3, 4)

  **References**:

  **Pattern References**:
  - `src/modules/auth/auth.service.ts:176-237` - 现有会话管理逻辑
  - `src/modules/auth/auth.service.ts:464-512` - 会话批量操作

  **API/Type References**:
  - `prisma/models/auth.prisma` - UserSession 模型定义

  **Acceptance Criteria**:

  **Manual Verification**:
  - [ ] 调用 `sessionRepository.findActiveByUserId(userId)`
    - 返回用户的活跃会话列表
  - [ ] 调用 `sessionRepository.revokeAllByUserId(userId)`
    - 所有会话的 isActive 变为 false

  **Commit**: YES
  - Message: `feat(repository): add SessionRepository with transaction support`
  - Files: `src/shared/repositories/session.repository.ts`
  - Pre-commit: `pnpm type-check`

---

### Phase 2: 安全加固

- [x] 6. 实现 CSRF 保护

  **What to do**:
  - 安装 csrf-csrf 库：`pnpm add csrf-csrf`
  - 创建 `src/common/guards/csrf.guard.ts`
  - 创建 `src/common/decorators/skip-csrf.decorator.ts` 用于路径豁免
  - 在 `src/main.ts` 注册 CSRF 中间件
  - 配置豁免路径：/health/_, /mock/_, OPTIONS 请求
  - 添加 CSRF 相关配置到 `src/config/security.config.ts`

  **Must NOT do**:
  - 不修改现有 CORS 配置
  - 不修改全局前缀排除列表

  **Parallelizable**: YES (with 7)

  **References**:

  **Pattern References**:
  - `src/main.ts:51-81` - Helmet 中间件配置示例
  - `src/common/guards/custom-throttler.guard.ts` - 自定义守卫示例
  - `src/common/decorators/database-log.decorator.ts` - 装饰器模式

  **API/Type References**:
  - `src/config/security.config.ts` - 安全配置

  **External References**:
  - csrf-csrf 文档: https://github.com/Psifi-Solutions/csrf-csrf

  **Acceptance Criteria**:

  **Manual Verification**:
  - [ ] 不带 CSRF token 发送 POST /api/v1/users
    - 应返回 403 Forbidden，message: "CSRF token missing"
  - [ ] 带正确 CSRF token 发送 POST /api/v1/users
    - 请求正常处理
  - [ ] 发送 GET /api/v1/health
    - 无需 CSRF token，正常返回
  - [ ] 发送 POST /mock/api/test
    - 无需 CSRF token（豁免路径）

  **Commit**: YES
  - Message: `feat(security): implement CSRF protection with path exemptions`
  - Files: `src/common/guards/csrf.guard.ts`, `src/common/decorators/skip-csrf.decorator.ts`, `src/main.ts`, `src/config/security.config.ts`
  - Pre-commit: `pnpm type-check`

---

- [x] 7. 实现渐进式账户锁定

  **What to do**:
  - 创建 `src/modules/auth/services/account-lockout.service.ts`
  - 使用 Redis INCR + EXPIRE 原子操作记录失败次数
  - 实现渐进式锁定：5次→15分钟，10次→1小时
  - 独立计数（锁定解除后计数归零）
  - 在 `src/modules/auth/auth.service.ts` 的 validateUser 中集成
  - 添加配置到 `src/config/security.config.ts`

  **Must NOT do**:
  - 不使用 GET→SET 模式（竞态条件）
  - 不发送邮件通知
  - 不做 IP 级别封禁

  **Parallelizable**: YES (with 6)

  **References**:

  **Pattern References**:
  - `src/modules/auth/auth.service.ts:66-101` - validateUser 方法
  - `src/shared/cache/cache.service.ts` - Redis 操作封装
  - `src/common/enums/error-codes.enum.ts` - 错误码定义

  **API/Type References**:
  - `src/modules/auth/auth.service.ts` - AuthService
  - `src/config/security.config.ts` - 安全配置

  **Acceptance Criteria**:

  **Manual Verification**:
  - [ ] 连续5次输错密码登录
    - 第6次返回 429，message: "账户已锁定，请15分钟后重试"
  - [ ] 等待15分钟后再次尝试
    - 可以正常登录（计数已重置）
  - [ ] 使用 redis-cli 检查锁定状态
    - `GET account:lockout:{userId}` 返回失败次数
    - `TTL account:lockout:{userId}` 返回剩余锁定时间

  **Commit**: YES
  - Message: `feat(auth): implement progressive account lockout with Redis`
  - Files: `src/modules/auth/services/account-lockout.service.ts`, `src/modules/auth/auth.service.ts`, `src/config/security.config.ts`, `src/common/enums/error-codes.enum.ts`
  - Pre-commit: `pnpm type-check`

---

### Phase 3: 弹性机制

- [ ] 8. 实现熔断器服务

  **What to do**:
  - 创建 `src/shared/resilience/circuit-breaker.service.ts`
  - 实现三态模型：Closed → Open → Half-Open
  - 配置：失败率阈值 50%，最小请求数 10，半开测试请求数 3
  - 熔断时返回 503 ServiceUnavailableException
  - 创建 ResilienceModule 并导出
  - 集成到 PrismaService 和 CacheService

  **Must NOT do**:
  - 不返回陈旧数据
  - 不永久打开熔断器（必须有半开状态）

  **Parallelizable**: NO (depends on 2-5)

  **References**:

  **Pattern References**:
  - `src/shared/database/prisma.service.ts` - 数据库服务
  - `src/shared/cache/implementations/redis-cache.service.ts` - Redis 服务

  **External References**:
  - Circuit Breaker Pattern: https://martinfowler.com/bliki/CircuitBreaker.html
  - opossum 库参考: https://github.com/nodeshift/opossum

  **Acceptance Criteria**:

  **Manual Verification**:
  - [ ] 停止 MySQL 服务，发送 API 请求
    - 连续失败后返回 503，message: "Service temporarily unavailable"
  - [ ] 重启 MySQL 服务
    - 半开状态下自动恢复正常
  - [ ] 检查应用日志
    - 应看到熔断器状态变化日志

  **Commit**: YES
  - Message: `feat(resilience): implement circuit breaker for database and Redis`
  - Files: `src/shared/resilience/circuit-breaker.service.ts`, `src/shared/resilience/resilience.module.ts`
  - Pre-commit: `pnpm type-check`

---

- [ ] 9. 实现重试装饰器

  **What to do**:
  - 创建 `src/shared/resilience/decorators/retryable.decorator.ts`
  - 参数：最大重试 3 次，初始延迟 100ms，2x 指数退避
  - 设置总超时上限 10s
  - 只应用于幂等操作（需显式标记）
  - 创建 `@Idempotent()` 装饰器标记幂等方法

  **Must NOT do**:
  - 不为所有操作自动添加重试
  - 写操作未标记 @Idempotent 时不重试

  **Parallelizable**: NO (depends on 8)

  **References**:

  **Pattern References**:
  - `src/common/decorators/database-log.decorator.ts` - 装饰器模式

  **External References**:
  - Exponential Backoff: https://en.wikipedia.org/wiki/Exponential_backoff

  **Acceptance Criteria**:

  **Manual Verification**:
  - [ ] 在 Repository 的读方法上添加 @Retryable()
    - 模拟网络抖动时自动重试
  - [ ] 检查日志
    - 应看到重试记录：`Retry attempt 1/3 for method X`
  - [ ] 验证超时
    - 总耗时不超过 10s

  **Commit**: YES
  - Message: `feat(resilience): add Retryable decorator with exponential backoff`
  - Files: `src/shared/resilience/decorators/retryable.decorator.ts`, `src/shared/resilience/decorators/idempotent.decorator.ts`
  - Pre-commit: `pnpm type-check`

---

### Phase 4: 性能优化

- [ ] 10. 修复 N+1 查询问题

  **What to do**:
  - 审计所有 Repository 的 findMany 方法
  - 确保关联数据使用 Prisma include 预加载
  - 重点检查：
    - 用户列表查询（需 include userRoles.role）
    - 角色列表查询（需 include rolePermissions.permission）
  - 在 Repository 中统一处理 include 逻辑

  **Must NOT do**:
  - 不修改现有缓存策略
  - 不引入 DataLoader（过度优化）

  **Parallelizable**: NO (depends on 2-5)

  **References**:

  **Pattern References**:
  - `src/modules/users/users.service.ts:114-136` - findAll 中的 include 用法
  - `src/modules/users/users.service.ts:228-250` - findByUsernameOrEmail 深层 include

  **Acceptance Criteria**:

  **Manual Verification**:
  - [ ] 开启 Prisma query 日志（log: ['query']）
  - [ ] 调用 GET /api/v1/users（返回 50 条记录）
    - 检查日志中的 SELECT 语句数量
    - 优化前：50+ 条查询（N+1）
    - 优化后：2-3 条查询（主查询 + include）

  **Commit**: YES
  - Message: `perf(repository): fix N+1 queries with proper includes`
  - Files: `src/shared/repositories/*.repository.ts`
  - Pre-commit: `pnpm type-check`

---

## Commit Strategy

| After Task | Message                                                           | Files                             | Verification    |
| ---------- | ----------------------------------------------------------------- | --------------------------------- | --------------- |
| 1          | `feat(config): add Zod validation for all configuration files`    | src/config/_, src/shared/config/_ | pnpm type-check |
| 2-5        | `feat(repository): add Repository layer with transaction support` | src/shared/repositories/\*        | pnpm type-check |
| 6          | `feat(security): implement CSRF protection with path exemptions`  | src/common/guards/\*, src/main.ts | pnpm type-check |
| 7          | `feat(auth): implement progressive account lockout with Redis`    | src/modules/auth/\*               | pnpm type-check |
| 8-9        | `feat(resilience): add circuit breaker and retry mechanism`       | src/shared/resilience/\*          | pnpm type-check |
| 10         | `perf(repository): fix N+1 queries with proper includes`          | src/shared/repositories/\*        | pnpm type-check |

---

## Success Criteria

### Verification Commands

```bash
# 1. 配置验证测试
NODE_ENV=production JWT_ACCESS_SECRET="" pnpm start:dev
# Expected: 应用退出，错误信息包含 "JWT_ACCESS_SECRET"

# 2. 账户锁定测试
for i in {1..6}; do curl -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"test","password":"wrong"}'; done
# Expected: 第6次返回 429

# 3. CSRF 测试
curl -X POST http://localhost:8000/api/v1/users -H "Content-Type: application/json" -d '{}'
# Expected: 403 Forbidden

# 4. 熔断器测试
# 停止 MySQL，发送请求，检查 503 响应
```

### Final Checklist

- [ ] 所有配置文件有 Zod 验证
- [ ] Repository 层覆盖 User/Role/Permission/Session
- [ ] CSRF 保护启用（豁免 /health/_, /mock/_）
- [ ] 账户锁定生效（5次→15分钟）
- [ ] 熔断器集成到数据库和 Redis
- [ ] 重试装饰器可用于幂等操作
- [ ] N+1 查询已修复（查询数量减少）
- [ ] 所有 Must NOT Have 护栏未被违反
