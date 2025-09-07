# 🚀 NestJS Enterprise API

> 企业级NestJS后端系统 - 安全、可扩展、生产就绪

![Node.js](https://img.shields.io/badge/Node.js-22.x-green?logo=node.js)
![NestJS](https://img.shields.io/badge/NestJS-11.x-red?logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.x-purple?logo=prisma)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange?logo=mysql)
![Redis](https://img.shields.io/badge/Redis-7.0-red?logo=redis)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ 特性

- 🔐 **认证授权**: JWT双Token机制 + RBAC权限控制
- 🛡️ **安全防护**: 限流、CORS、Helmet、数据验证等全面安全策略
- 📊 **监控体系**: 健康检查、结构化日志、性能监控
- 🗄️ **数据层**: Prisma ORM + MySQL + Redis缓存
- 📝 **API文档**: 自动生成Swagger文档
- 🔧 **开发体验**: 热重载、代码规范、Git hooks
- 🐳 **容器化**: Docker支持，一键部署
- 🧪 **测试**: 单元测试、集成测试、E2E测试

## 🛠️ 技术栈

### 核心框架
- **NestJS**: 11.x - 企业级Node.js框架
- **Node.js**: 22.x LTS - 运行时环境
- **TypeScript**: 5.x - 类型安全
- **pnpm**: 9.x - 包管理器

### 数据库
- **MySQL**: 8.0+ - 主数据库
- **Prisma**: 6.x - ORM框架
- **Redis**: 7.0+ - 缓存系统

### 认证授权
- **JWT**: 双Token机制 (Access + Refresh)
- **RBAC**: 基于角色的权限控制
- **bcrypt**: 密码加密

## 项目结构

```
src/
├── app.module.ts                 # 根模块
├── main.ts                      # 应用入口
├── common/                      # 公共模块
│   ├── constants/               # 常量定义
│   ├── decorators/              # 自定义装饰器
│   ├── dto/                     # 通用DTO
│   ├── enums/                   # 枚举定义
│   ├── exceptions/              # 异常处理
│   ├── filters/                 # 异常过滤器
│   ├── guards/                  # 守卫
│   ├── interceptors/            # 拦截器
│   ├── interfaces/              # 接口定义
│   ├── middlewares/             # 中间件
│   ├── pipes/                   # 管道
│   └── utils/                   # 工具函数
├── config/                      # 配置模块
│   ├── app.config.ts            # 应用配置
│   ├── database.config.ts       # 数据库配置
│   ├── jwt.config.ts            # JWT配置
│   └── redis.config.ts          # Redis配置
├── modules/                     # 业务模块
│   ├── auth/                    # 认证模块
│   ├── users/                   # 用户模块
│   ├── roles/                   # 角色模块
│   ├── permissions/             # 权限模块
│   ├── health/                  # 健康检查
│   └── public-api/              # 公开API模块
├── shared/                      # 共享模块
│   ├── database/                # 数据库服务
│   ├── cache/                   # 缓存服务
│   └── logger/                  # 日志服务
└── prisma/                      # 数据库相关
    ├── migrations/              # 迁移文件
    └── schema.prisma            # Prisma Schema
```

## 核心功能

### 🔐 认证授权
- JWT双Token机制
- 访问令牌 (15分钟) + 刷新令牌 (7天)
- RBAC权限控制
- 会话管理

### 🛡️ 安全防护
- Helmet安全头
- CORS跨域控制
- 请求限流 (多级限流)
- 参数验证
- SQL注入防护
- XSS防护

### 📊 监控日志
- 结构化日志 (Winston)
- API调用日志
- 错误日志
- 性能监控
- 健康检查

### 🔧 错误处理
- 统一错误码体系 (字母前缀+五位数字)
- 全局异常过滤器
- 业务异常类
- RequestId链路追踪

## 快速开始

### 1. 安装依赖
```bash
pnpm install
```

### 2. 环境配置
```bash
cp .env.example .env
# 编辑 .env 文件配置数据库连接等信息
```

### 3. 数据库设置
```bash
# 生成Prisma客户端
pnpm db:generate

# 运行数据库迁移
pnpm db:migrate

# (可选) 查看数据库
pnpm db:studio
```

### 4. 启动应用
```bash
# 开发模式
pnpm start:dev

# 生产模式
pnpm build
pnpm start:prod
```

### 5. 访问应用
- 应用地址: http://localhost:3000
- API文档: http://localhost:3000/api/docs
- 健康检查: http://localhost:3000/api/v1/health

## 可用脚本

```bash
# 开发
pnpm start:dev          # 开发模式启动
pnpm start:debug        # 调试模式启动

# 构建
pnpm build              # 构建项目

# 测试
pnpm test               # 运行单元测试
pnpm test:e2e           # 运行端到端测试
pnpm test:cov           # 运行测试覆盖率

# 代码质量
pnpm lint               # 代码检查
pnpm format             # 代码格式化

# 数据库
pnpm db:generate        # 生成Prisma客户端
pnpm db:migrate         # 运行迁移
pnpm db:studio          # 打开Prisma Studio
pnpm db:seed            # 运行种子数据
```

## 环境变量

主要环境变量配置：

```env
NODE_ENV=development          # 环境：development/production/test
PORT=3000                    # 应用端口
DATABASE_URL=mysql://...     # 数据库连接字符串
REDIS_HOST=localhost         # Redis主机
JWT_ACCESS_SECRET=...        # JWT访问令牌密钥
JWT_REFRESH_SECRET=...       # JWT刷新令牌密钥
LOG_LEVEL=info              # 日志级别
```

## API文档

项目集成了 Swagger/OpenAPI，启动应用后访问 `/api/docs` 查看完整的API文档。

## 错误码

系统采用字母前缀+五位数字的错误码格式：

- `S10xxx`: 系统错误
- `A10xxx`: 认证错误  
- `P10xxx`: 权限错误
- `U10xxx`: 用户错误
- `V10xxx`: 验证错误
- `R10xxx`: 限流错误
- `B10xxx`: 业务错误

## 部署

### Docker 部署 (推荐)
```bash
# 构建镜像
docker build -t enterprise-nestjs .

# 使用 docker-compose
docker-compose up -d
```

### 传统部署
```bash
# 使用 PM2
pnpm build
pm2 start ecosystem.config.js
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。
