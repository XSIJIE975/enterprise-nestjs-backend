# 项目基础设施改进 - 学习笔记

## Phase 1: 基础设施准备

### TODO 1: Zod 配置验证

**开始时间**: 2026-01-26T13:44:00.887Z

#### 关键决策

- 使用 Zod 库进行配置验证
- 每个配置文件独立验证（而非集中验证）
- 开发环境验证失败仅警告，生产环境 process.exit(1)
- 不使用 LoggerService（避免循环依赖），使用 console.error

#### 现有模式发现

- 配置文件位于 `src/config/*.config.ts`
- 使用 `registerAs()` 工厂函数模式
- 配置加载顺序：`.env.local` → `.env.${NODE_ENV}` → `.env`
- 已有边界验证示例：`src/config/security.config.ts` 的 MAX_CONCURRENT_SESSIONS

#### 需要验证的配置项

1. JWT_ACCESS_SECRET - 最小 32 字符
2. JWT_REFRESH_SECRET - 最小 32 字符
3. DATABASE_URL - 必需
4. REDIS_HOST - 必需（如果启用 Redis）
5. 其他关键配置...

#### 实现计划

1. 安装 zod 依赖
2. 为 9 个配置文件创建 Zod schema
3. 创建统一验证入口 `src/shared/config/config-validator.ts`
4. 在 `src/main.ts` 启动时调用验证

---

## 完成记录

### Zod 配置验证 - 完成

**完成时间**: 2026-01-26T13:53:00.000Z

#### 实现总结

1. **安装 zod 依赖**: zod v4.3.6
2. **9个配置文件添加 Zod schema**:
   - `app.config.ts` - appEnvSchema
   - `database.config.ts` - databaseEnvSchema (DATABASE_URL 必需)
   - `jwt.config.ts` - jwtEnvSchema (JWT_ACCESS_SECRET/JWT_REFRESH_SECRET 最小32字符)
   - `redis.config.ts` - redisEnvSchema
   - `security.config.ts` - securityEnvSchema
   - `throttle.config.ts` - throttleEnvSchema
   - `upload.config.ts` - uploadEnvSchema
   - `mail.config.ts` - mailEnvSchema
   - `health.config.ts` - healthEnvSchema

3. **统一验证入口**: `src/shared/config/config-validator.ts`
   - validateConfigOnStartup() 函数
   - 开发环境验证失败输出 console.warn，应用继续
   - 生产环境验证失败输出 console.error + process.exit(1)

4. **main.ts 集成**: 在 bootstrap() 之前调用 validateConfigOnStartup()

#### 关键验证规则

| 配置项                  | 规则         |
| ----------------------- | ------------ |
| JWT_ACCESS_SECRET       | 最小 32 字符 |
| JWT_REFRESH_SECRET      | 最小 32 字符 |
| DATABASE_URL            | 必需         |
| MAX_CONCURRENT_SESSIONS | 1-10 范围    |
| BCRYPT_ROUNDS           | 4-31 范围    |

#### 模式发现

- 每个配置文件独立导出 schema + type，便于单独使用
- 使用 z.coerce.number() 处理环境变量字符串到数字转换
- 配置验证在 NestJS 应用创建之前执行，避免循环依赖

---

## [2026-01-26 22:00] Task: TODO 1 - Zod 配置验证

### 配置验证实现模式

- **分布式 Schema**: 每个配置文件导出独立的 `*EnvSchema`，避免循环依赖
- **统一验证入口**: `config-validator.ts` 聚合所有 schema，在 `main.ts` 启动前调用
- **环境差异化处理**: 开发环境 `console.warn` + 继续运行，生产环境 `console.error` + `process.exit(1)`
- **避免依赖注入**: 不使用 `LoggerService`（会引起循环依赖），直接用 `console.*`

### Zod 验证最佳实践

- 敏感配置强制最小长度: `.min(32, 'JWT_ACCESS_SECRET must be at least 32 characters')`
- 必需字段不设默认值: 使用 `.string()` 而非 `.string().default('...')`
- 可选字段显式标记: `.string().optional()` 允许 undefined

### 构建产物路径

- NestJS 构建输出: `dist/src/**`（不是 `dist/**`）
- 导入路径: `require('./dist/src/shared/config/config-validator')`

---

## [2026-01-26] Task: UserRepository 数据访问层

### Repository 代码组织（shared/repositories）

- 该项目已存在 `src/shared/repositories` 统一目录，并通过 `RepositoriesModule` 集中导出。
- Repository 实现类使用 `@Injectable()`，并以 `implements <Interface>` 约束。

### 事务（tx）参数约定

- Repository 方法统一接受可选 `tx?: Prisma.TransactionClient`。
- 通过 `private client(tx?: Prisma.TransactionClient) { return tx ?? this.prisma; }` 在同一套实现中兼容事务内/外调用。

### 软删除过滤模式

- 对于软删除模型（如 User），读操作使用 `findFirst` + `where: { deletedAt: null }` 过滤；更新/删除使用 `updateMany` + `count` 判断是否命中，避免误更新已软删除记录。
- `delete` 采用软删除：`deletedAt = new Date()`。

### Prisma 错误到 HTTP 异常映射

- 使用 `PrismaClientKnownRequestError` 捕获 `P2002`(唯一约束) / `P2025`(记录不存在)，并映射到 `ConflictException` / `NotFoundException`。
- 对 `P2002` 解析 `error.meta.target`（string 或 string[]）以定位冲突字段，输出更友好的业务错误信息。

### 重要环境限制

- 当前环境缺少 `typescript-language-server`，无法执行 `lsp_diagnostics`；以 `pnpm type-check` 作为主要验证手段。

## [2026-01-26 23:45] Task: TODO 6 - CSRF 保护

### CSRF 保护实现

- **库选择**: csrf-csrf v4.0.3（double-submit cookie 策略）
- **必需参数**: getSecret + getSessionIdentifier（用于区分用户会话）
- **API**: doubleCsrf() 返回 { validateRequest, generateCsrfToken, ... }
- **路径豁免**: /health/_, /mock/_ 自动豁免，支持装饰器 @SkipCsrf()
- **方法过滤**: 仅保护 POST/PUT/DELETE，GET/HEAD/OPTIONS 自动放行

## [2026-01-27 00:10] Task: TODO 7 - 渐进式账户锁定

### 账户锁定实现

- **渐进式策略**: 5次失败→15分钟，10次失败→1小时
- **原子操作**: 使用 CacheService 的 get/set 模拟 Redis INCR
- **独立计数**: 锁定触发后立即重置失败计数
- **集成点**: validateUser 方法，登录前检查锁定，失败后记录，成功后重置
- **锁定检测**: checkLockStatus 返回锁定状态和剩余时间

## [2026-01-27 00:15] 会话进度总结

### 已完成任务（7/23 = 30%）

**Phase 1: 基础设施准备（5/5）**

- ✅ TODO 1: Zod 配置验证
- ✅ TODO 2-5: Repository 层（User/Role/Permission/Session）

**Phase 2: 安全加固（2/2）**

- ✅ TODO 6: CSRF 保护（3 个原子提交）
- ✅ TODO 7: 渐进式账户锁定

### 剩余任务（16/23）

**Phase 3: 弹性机制（2个）**

- ⏳ TODO 8: 熔断器服务（三态模型）
- ⏳ TODO 9: 重试装饰器（指数退避）

**Phase 4: 性能优化（1个）**

- ⏳ TODO 10: N+1 查询修复

### 关键学习

1. **子代理限制**: 反复拒绝多文件任务，需要拆分为原子提交或手动实现
2. **配置验证**: Zod schema + 启动时验证，dev 警告 / prod 退出
3. **CSRF**: double-submit cookie 模式，路径豁免，csrf-csrf 库集成
4. **账户锁定**: 渐进式策略，Redis 计数，独立锁定状态
5. **Repository 模式**: 事务支持（可选 tx 参数），软删除过滤，Prisma 错误处理
