# 系统架构概览

> 企业级 NestJS 后端系统的整体架构设计

## 项目简介

这是一个基于 NestJS 11.x 构建的企业级后端系统,具备完整的认证授权、RBAC 权限控制、日志追踪、缓存管理等企业级特性。

## 核心特性

- ✅ **JWT 双 Token 认证机制**: Access Token + Refresh Token
- ✅ **RBAC 权限控制**: 用户-角色-权限三层模型
- ✅ **完整的日志系统**: 文件日志 + 数据库日志 + 请求链路追踪
- ✅ **多级缓存策略**: Redis + 内存缓存
- ✅ **全局错误处理**: 统一错误码 + 异常过滤器
- ✅ **API 文档自动生成**: Swagger/OpenAPI
- ✅ **Docker 容器化部署**: 开箱即用的 Docker 配置

## 技术栈

| 类别     | 技术       | 版本     | 说明                  |
| -------- | ---------- | -------- | --------------------- |
| 框架     | NestJS     | 11.x     | 企业级 Node.js 框架   |
| 语言     | TypeScript | 5.x      | 类型安全的 JavaScript |
| 运行时   | Node.js    | 22.x LTS | JavaScript 运行环境   |
| 数据库   | MySQL      | 8.0+     | 关系型数据库          |
| ORM      | Prisma     | 6.x      | 现代化的 ORM 工具     |
| 缓存     | Redis      | 7.0+     | 内存数据库            |
| 包管理器 | pnpm       | 9.x      | 高效的包管理工具      |

---

## 整体架构图

```text
┌─────────────────────────────────────────────────────────┐
│                    客户端层                               │
│            (Web App / Mobile App / API)                 │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/HTTPS
┌──────────────────────┴──────────────────────────────────┐
│                   负载均衡层                              │
│                    (Nginx)                               │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                  中间件层                                 │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │ 日志中间件   │ CORS 中间件   │ 压缩中间件   │        │
│  │(Logger)      │(CORS)         │(Compression) │        │
│  └──────────────┴──────────────┴──────────────┘        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                  守卫层                                   │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │ JWT 守卫     │ RBAC 守卫    │ 限流守卫     │        │
│  │(JwtGuard)    │(RolesGuard)  │(ThrottlerG)  │        │
│  └──────────────┴──────────────┴──────────────┘        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                  拦截器层                                 │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │ 响应拦截器   │ 日志拦截器   │ 缓存拦截器   │        │
│  │(Response)    │(Logging)     │(Cache)       │        │
│  └──────────────┴──────────────┴──────────────┘        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                  控制器层                                 │
│  (处理 HTTP 请求，调用服务层)                            │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                  服务层                                   │
│  (业务逻辑处理)                                          │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                  数据访问层                              │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │ Prisma ORM   │ Redis Cache  │ File System  │        │
│  └──────────────┴──────────────┴──────────────┘        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                  存储层                                   │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │ MySQL        │ Redis        │ File Storage │        │
│  └──────────────┴──────────────┴──────────────┘        │
└─────────────────────────────────────────────────────────┘
```

---

## 分层职责

### 中间件层 (Middleware Layer)

**职责**: 请求预处理、日志记录、请求上下文初始化

**核心组件**:

- `LoggerMiddleware`: 生成 requestId, 初始化请求上下文
- CORS 中间件: 处理跨域请求
- Compression 中间件: 响应数据压缩

**执行时机**: 请求进入后端的第一层

### 守卫层 (Guards Layer)

**职责**: 认证、授权、访问控制

**核心组件**:

- `JwtAuthGuard`: JWT Token 验证
- `RolesGuard`: RBAC 权限校验
- `ThrottlerGuard`: 请求频率限制

**执行时机**: 中间件执行后、路由处理前

### 拦截器层 (Interceptors Layer)

**职责**: 响应格式化、日志记录、缓存管理

**核心组件**:

- `ResponseInterceptor`: 统一响应格式
- `LoggingInterceptor`: 记录 API 日志到数据库
- Cache 拦截器: 处理响应缓存

**执行时机**: 路由处理前后(前置 + 后置)

### 控制器层 (Controller Layer)

**职责**: 路由处理、参数验证、调用服务层

**示例**: `UsersController`, `AuthController`

**特点**:

- 使用装饰器定义路由: `@Get()`, `@Post()`
- 使用 DTO 验证请求参数
- 保持轻量,不包含业务逻辑

### 服务层 (Service Layer)

**职责**: 业务逻辑处理

**示例**: `UsersService`, `AuthService`

**特点**:

- 包含核心业务逻辑
- 调用数据访问层操作数据
- 可被其他服务注入和调用

### 数据访问层 (Data Access Layer)

**职责**: 数据库操作、缓存操作、文件操作

**核心组件**:

- `PrismaService`: MySQL 数据库操作
- `CacheService`: Redis 缓存操作
- File Service: 文件存储操作

**特点**:

- 封装底层数据操作
- 提供统一的数据访问接口

---

## 项目目录结构

```text
enterprise-nestjs-backend/
├── docker/                       # Docker 相关配置
│   └── mysql/
│       └── init.sql             # MySQL 初始化脚本
├── docs/                        # 项目文档
│   ├── guides/                  # 开发指南
│   ├── architecture/            # 架构文档
│   ├── modules/                 # 模块文档
│   └── api/                     # API 文档
├── logs/                        # 日志文件目录
│   ├── application-YYYY-MM-DD.log
│   └── error-YYYY-MM-DD.log
├── prisma/                      # Prisma 配置
│   ├── schema.prisma            # 数据库 Schema
│   ├── seed.ts                  # 种子数据
│   ├── models/                  # Schema 模型
│   └── migrations/              # 数据库迁移
├── scripts/                     # 脚本文件
├── src/                        # 源代码
│   ├── app.module.ts           # 根模块
│   ├── main.ts                 # 应用入口
│   ├── common/                 # 公共模块
│   ├── config/                 # 配置文件
│   ├── modules/                # 业务模块
│   ├── shared/                 # 共享服务
│   └── examples/              # 示例代码
└── test/                       # 测试文件
```

### 核心目录说明

#### `src/common/` - 公共模块

存放项目中可复用的公共组件,与具体业务无关。

- `decorators/`: 自定义装饰器
- `filters/`: 全局异常过滤器
- `guards/`: 认证和授权守卫
- `interceptors/`: 拦截器
- `middlewares/`: 中间件
- `pipes/`: 数据转换和验证管道
- `utils/`: 工具函数

#### `src/config/` - 配置文件

存放应用配置,使用 `@nestjs/config` 管理。

- `app.config.ts`: 应用基础配置
- `database.config.ts`: 数据库连接配置
- `jwt.config.ts`: JWT 认证配置
- `redis.config.ts`: Redis 缓存配置

#### `src/modules/` - 业务模块

存放具体的业务功能模块,每个模块包含完整的 MVC 结构。

标准模块结构:

```text
modules/users/
├── users.module.ts      # 模块定义
├── users.controller.ts  # 控制器
├── users.service.ts     # 服务
├── dto/                 # 数据传输对象
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
├── entities/            # 实体定义(可选)
│   └── user.entity.ts
└── guards/              # 模块专用守卫(可选)
```

#### `src/shared/` - 共享服务

存放跨模块共享的服务,这些服务通常被标记为 `@Global()`。

- `database/`: Prisma 数据库服务
- `cache/`: Redis 缓存服务
- `logger/`: 日志服务
- `request-context/`: 请求上下文服务

---

## 设计原则

### 1. 单一职责原则 (SRP)

每个类、模块只负责一个功能领域。

**示例**:

- `UsersService`: 只处理用户相关业务
- `AuthService`: 只处理认证相关业务

### 2. 依赖注入 (DI)

使用 NestJS 的依赖注入系统管理组件依赖。

```typescript
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly logger: LoggerService,
  ) {}
}
```

### 3. 模块化设计

功能按模块组织,模块间低耦合、高内聚。

- 每个功能模块独立
- 通过接口交互
- 可独立测试和部署

### 4. 配置外部化

所有配置通过环境变量管理,代码与配置分离。

```typescript
// config/app.config.ts
export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  environment: process.env.NODE_ENV || 'development',
}));
```

### 5. 分层架构

严格的分层架构,上层依赖下层,下层不依赖上层。

```text
Controller -> Service -> Repository
```

---

## 技术亮点

### 1. 请求链路追踪

使用 `AsyncLocalStorage` 实现零侵入的请求链路追踪:

- 自动生成 requestId
- 在整个请求生命周期中自动传递
- 所有日志自动关联 requestId

### 2. 双 Token 认证

- **Access Token**: 短期有效,用于 API 访问
- **Refresh Token**: 长期有效,用于刷新 Access Token

### 3. RBAC 权限模型

- **用户 (User)**: 系统使用者
- **角色 (Role)**: 权限集合
- **权限 (Permission)**: 具体操作授权

### 4. 多级缓存

- **L1**: 内存缓存(进程内)
- **L2**: Redis 缓存(分布式)

### 5. 完整的日志系统

- **文件日志**: Winston + 日志轮转
- **数据库日志**: API 日志、错误日志、审计日志
- **日志级别**: debug, info, warn, error

---

## 下一步

- [请求生命周期详解](./request-lifecycle.md)
- [数据库设计规范](./database-design.md)
- [开发工作流程](../guides/development-workflow.md)

---

**维护者**: XSIJIE
**最后更新**: 2025-10-10
