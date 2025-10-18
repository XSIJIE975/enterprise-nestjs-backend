# 企业级 NestJS 后端系统

> 生产级 NestJS 后端系统 | JWT 双 Token + RBAC | 完整日志链路追踪 | Redis 多级缓存 | 健康监控 | Prisma ORM | Docker 部署 | 开箱即用

![Node.js](https://img.shields.io/badge/Node.js-22.x-green?logo=node.js)
![NestJS](https://img.shields.io/badge/NestJS-11.x-red?logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.x-purple?logo=prisma)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange?logo=mysql)
![Redis](https://img.shields.io/badge/Redis-7.0-red?logo=redis)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## 项目特性

- **JWT 双 Token 认证** - Access Token + Refresh Token 机制
- **RBAC 权限控制** - 用户-角色-权限三层模型
- **完整日志系统** - 文件日志 + 数据库日志 + 请求链路追踪
- **多级缓存策略** - Redis + 内存缓存
- **全局错误处理** - 统一错误码 + 异常过滤器
- **API 文档自动生成** - Swagger/OpenAPI
- **Docker 容器化** - 开箱即用的 Docker 配置
- **企业级特性** - 限流、CORS、Helmet、参数验证

## 核心技术

| 类别     | 技术       | 版本     |
| -------- | ---------- | -------- |
| 框架     | NestJS     | 11.x     |
| 语言     | TypeScript | 5.x      |
| 运行时   | Node.js    | 22.x LTS |
| 数据库   | MySQL      | 8.0+     |
| ORM      | Prisma     | 6.x      |
| 缓存     | Redis      | 7.0+     |
| 包管理器 | pnpm       | 9.x      |

## 文档导航

完整的项目文档位于 `docs/` 目录，请访问 [文档首页](docs/README.md) 查看完整导航。

### 快速入门指南

- [环境搭建](docs/guides/getting-started.md) - 从零开始搭建开发环境
- [系统架构概览](docs/architecture/overview.md) - 了解整体架构设计
- [请求生命周期](docs/architecture/request-lifecycle.md) - 理解请求处理流程

### 开发者文档

- [开发工作流](docs/guides/development-workflow.md) - 学习模块开发流程
- [编码规范](docs/guides/coding-standards.md) - 遵循项目代码规范
- [日志系统](docs/modules/logging.md) - 掌握日志记录和链路追踪
- [认证授权](docs/modules/authentication.md) - JWT 双 Token 认证机制

### 架构文档

- [数据库设计规范](docs/architecture/database-design.md) - Prisma + MySQL 最佳实践

## 快速开始

### 环境要求

- Node.js 22.0.0+
- pnpm 9.0.0+
- Docker Desktop (推荐)

### 一键启动

**Windows:**

```bash
.\scripts\start.bat
```

**Linux/macOS:**

```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

### 手动启动

#### 步骤 1: 安装依赖

```bash
pnpm install
```

#### 步骤 2: 配置环境变量

```bash
cp .env.example .env
```

#### 步骤 3: 启动数据库

```bash
pnpm docker:dev
```

#### 步骤 4: 初始化数据库

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

#### 步骤 5: 启动应用

```bash
pnpm start:dev
```

### 访问服务

- 主应用: <http://localhost:8000>
- API 文档: <http://localhost:8000/api/docs>
- 健康检查: <http://localhost:8000/api/v1/health>

### 测试账户

- 管理员: `admin@enterprise.local` / `admin123456`
- 普通用户: `test@enterprise.local` / `test123456`

详细说明请查看 [快速开始指南](docs/guides/getting-started.md)

## 常用命令

### 开发命令

```bash
pnpm start:dev      # 开发模式
pnpm start:debug    # 调试模式
pnpm build          # 生产构建
pnpm start:prod     # 生产模式
```

### 数据库命令

```bash
pnpm db:generate    # 生成 Prisma 客户端
pnpm db:migrate     # 运行迁移
pnpm db:seed        # 填充数据
pnpm db:studio      # 打开 Prisma Studio
```

### Docker 命令

```bash
pnpm docker:dev         # 启动开发环境
pnpm docker:dev:down    # 停止开发环境
pnpm docker:dev:logs    # 查看日志
```

### 代码质量命令

```bash
pnpm lint           # 代码检查
pnpm format         # 代码格式化
pnpm type-check     # 类型检查
```

### 测试命令

```bash
pnpm test           # 单元测试
pnpm test:watch     # 监听模式
pnpm test:cov       # 覆盖率报告
pnpm test:e2e       # E2E 测试
```

## 环境配置

主要配置项:

```env
NODE_ENV=development
PORT=8000
DATABASE_URL=mysql://...
REDIS_HOST=localhost
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
LOG_LEVEL=info
```

完整配置请参考 `.env.example` 文件

## API 文档

启动应用后访问:

- <http://localhost:8000/api/docs> - Swagger UI
- <http://localhost:8000/api/docs-json> - Swagger JSON

## 错误码体系

| 前缀 | 范围          | 说明     |
| ---- | ------------- | -------- |
| S    | S10000-S19999 | 系统错误 |
| A    | A10000-A19999 | 认证错误 |
| P    | P10000-P19999 | 权限错误 |
| U    | U10000-U19999 | 用户错误 |
| V    | V10000-V19999 | 验证错误 |
| R    | R10000-R19999 | 限流错误 |
| B    | B10000-B99999 | 业务错误 |

## 部署说明

### Docker 部署

```bash
docker build -t enterprise-nestjs .
docker-compose -f docker-compose.prod.yml up -d
```

### 传统部署

```bash
pnpm build
pm2 start ecosystem.config.js
```

## 贡献指南

欢迎贡献代码！请遵循以下流程:

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

提交规范请遵循 [Conventional Commits](https://www.conventionalcommits.org/)

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

- 邮箱: <xsijie975@qq.com>
- 问题反馈: [GitHub Issues](https://github.com/XSIJIE975/enterprise-nestjs-backend/issues)

---

**最后更新**: 2025-10-18

Made with ❤️ by XSIJIE
