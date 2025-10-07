# GitHub Copilot 项目指令

这是一个企业级 NestJS 后端系统项目的自定义指令文件。

## 项目概述

- **项目类型**: 企业级 NestJS 后端 API 系统
- **技术栈**: NestJS 11.x + TypeScript 5.x + Prisma + MySQL + Redis + JWT + RBAC
- **包管理器**: pnpm 9.x
- **Node 版本**: 22.x
- **架构模式**: 模块化、分层架构

## 技术栈详情

### 核心框架

- **NestJS 11.x**: 主框架
- **TypeScript 5.x**: 编程语言
- **Express**: HTTP 服务器

### 数据库与 ORM

- **MySQL 8.x**: 关系型数据库
- **Prisma 6.x**: ORM 框架
- **Redis 5.x**: 缓存和会话存储

### 认证与授权

- **JWT**: 基于令牌的身份验证
- **Passport**: 认证中间件
- **RBAC**: 基于角色的访问控制

### 日志与监控

- **Winston**: 日志记录
- **winston-daily-rotate-file**: 日志文件轮转
- **@nestjs/terminus**: 健康检查

### 工具库

- **class-validator**: DTO 验证
- **class-transformer**: 数据转换
- **bcrypt**: 密码加密

## 代码规范

### 命名约定

- **文件名**: kebab-case (例如: `user.service.ts`)
- **类名**: PascalCase (例如: `UserService`)
- **变量/函数**: camelCase (例如: `getUserById`)
- **常量**: UPPER_SNAKE_CASE (例如: `MAX_RETRY_COUNT`)
- **接口**: PascalCase，以 `I` 开头可选 (例如: `IUser` 或 `User`)

### 目录结构

```
src/
├── config/           # 配置文件
├── common/           # 通用组件（装饰器、过滤器、拦截器、中间件）
├── modules/          # 业务模块
├── shared/           # 共享服务（数据库、缓存、日志）
└── main.ts           # 应用入口
```

### 模块结构

每个业务模块应包含：

- `*.module.ts`: 模块定义
- `*.controller.ts`: 控制器
- `*.service.ts`: 业务逻辑
- `*.dto.ts`: 数据传输对象
- `*.entity.ts` 或使用 Prisma 生成的类型

### TypeScript 规范

- 使用严格模式 (`strict: true`)
- 优先使用 `interface` 定义数据结构
- 使用类型推断，避免显式 `any`
- 导出类型：`export type` 或 `export interface`

### 异步处理

- 统一使用 `async/await` 而非 Promise 链
- 正确处理错误（try-catch 或使用 NestJS 异常过滤器）

### 依赖注入

- 使用构造函数注入
- 服务应标注 `@Injectable()`
- 避免循环依赖

## 开发指导

### API 设计

- RESTful 风格
- 版本控制: `/api/v1/...`
- 统一响应格式:
  ```typescript
  {
    success: boolean;
    data: any;
    message?: string;
    timestamp: string;
    requestId: string;
  }
  ```

### 错误处理

- 使用自定义业务异常 `BusinessException`
- 使用全局异常过滤器统一处理
- 定义错误码枚举 `ErrorCode`

### 日志记录

- 使用 `LoggerService` 进行日志记录
- 包含请求上下文 (requestId, userId)
- 日志级别: error, warn, info, debug

### 数据验证

- DTO 使用 `class-validator` 装饰器
- 管道验证: `ValidationPipe`
- 自定义验证器在 `common/validators/`

### 认证授权

- JWT Token 认证
- 使用 `@UseGuards(JwtAuthGuard)` 保护路由
- RBAC 权限控制使用 `@Roles()` 和 `@Permissions()` 装饰器

### 数据库操作

- 使用 Prisma Client
- 事务处理使用 `prisma.$transaction()`
- 迁移命令: `pnpm db:migrate`

### 缓存策略

- 使用 Redis 缓存热点数据
- 通过 `CacheService` 统一管理
- 设置合理的过期时间

### 测试

- 单元测试: `*.spec.ts`
- E2E 测试: `test/*.e2e-spec.ts`
- 使用 Jest 测试框架
- 测试覆盖率目标: 80%+

## Git 提交规范

遵循 Conventional Commits:

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链变更

示例: `feat(auth): 实现 JWT 刷新令牌功能`

## 环境配置

- 开发环境: `.env.development`
- 测试环境: `.env.test`
- 生产环境: `.env.production`
- 环境变量通过 `@nestjs/config` 管理

## 常用命令

```bash
# 开发
pnpm start:dev

# 构建
pnpm build

# 测试
pnpm test

# 数据库迁移
pnpm db:migrate

# 代码检查
pnpm lint
pnpm type-check
```

## 注意事项

1. **安全性**: 永远不要在代码中硬编码敏感信息
2. **性能**: 注意 N+1 查询问题，使用 Prisma 的 `include` 优化
3. **可维护性**: 保持函数简洁，单一职责原则
4. **文档**: 重要功能添加 JSDoc 注释和 Swagger 装饰器
5. **时区**: 统一使用 UTC 存储，Asia/Shanghai 显示

---

**Copilot 提示**: 生成代码时请遵循以上规范，保持与项目现有代码风格一致。
