# 快速开始指南

> 从零开始快速搭建开发环境并启动项目

## 📋 前置要求

### 必需软件

在开始之前，请确保安装以下软件：

| 软件           | 版本要求 | 下载地址                                                      |
| -------------- | -------- | ------------------------------------------------------------- |
| Node.js        | 22.0.0+  | [nodejs.org](https://nodejs.org/)                             |
| pnpm           | 9.0.0+   | `npm install -g pnpm`                                         |
| Docker Desktop | 最新版   | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Git            | 最新版   | [git-scm.com](https://git-scm.com/)                           |

### 验证安装

```bash
node --version    # v22.x.x
pnpm --version    # 9.x.x
docker --version  # Docker version x.x.x
git --version     # git version x.x.x
```

---

## 🚀 快速启动

### 方式一：自动脚本（推荐）

#### Windows 系统

```powershell
.\scripts\start.ps1
```

#### Linux/macOS 系统

```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

### 方式二：手动启动

#### 步骤 1：克隆并安装依赖

```bash
# 克隆项目（如果还没有）
git clone <repository-url>
cd enterprise-nestjs-backend

# 安装依赖
pnpm install
```

#### 步骤 2：配置环境变量

```bash
# 复制环境配置文件
cp .env.example .env

# 编辑配置（可选，默认配置可直接使用）
# 修改 .env 文件中的配置项
```

**主要配置项：**

```env
# 应用配置
NODE_ENV=development
PORT=3000

# 数据库配置
DATABASE_URL="mysql://root:password@localhost:3306/enterprise_db"

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT 配置
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# 其他配置项请参考 .env.example 文件
```

#### 步骤 3：生成 Prisma 客户端

```bash
pnpm db:generate
```

#### 步骤 4：启动数据库服务

```bash
# 启动 Docker 容器（MySQL + Redis）
pnpm docker:dev

# 查看容器状态
docker ps
```

应该看到以下容器正在运行：

- `enterprise-mysql` - MySQL 8.0
- `enterprise-redis` - Redis 7.0

#### 步骤 5：初始化数据库

```bash
# 等待数据库完全启动（约 15-30 秒）
# Windows
timeout /t 15
# Linux/macOS
sleep 15

# 运行数据库迁移
pnpm db:migrate

# 填充初始数据（可选）
pnpm db:seed
```

#### 步骤 6：启动应用

```bash
# 开发模式启动
pnpm start:dev

# 或调试模式
pnpm start:debug
```

---

## 🌐 访问服务

启动成功后，访问以下地址：

| 服务           | 地址                                | 说明            |
| -------------- | ----------------------------------- | --------------- |
| **主应用**     | http://localhost:8000               | NestJS 应用     |
| **API 文档**   | http://localhost:8000/api/docs      | Swagger 文档    |
| **健康检查**   | http://localhost:8000/api/v1/health | 系统健康状态    |
| **数据库管理** | http://localhost:8080               | Adminer         |
| **Redis 管理** | http://localhost:8081               | Redis Commander |

### Adminer 登录信息

- **服务器**: `enterprise-mysql`
- **用户名**: `root`
- **密码**: `password`
- **数据库**: `enterprise_db`

---

## 👤 默认测试账户

系统会自动创建以下测试账户：

### 管理员账户

- **邮箱**: `admin@enterprise.local`
- **密码**: `admin123456`
- **角色**: 超级管理员
- **权限**: 所有权限

### 普通用户账户

- **邮箱**: `test@enterprise.local`
- **密码**: `test123456`
- **角色**: 普通用户
- **权限**: 基础权限

---

## 🔧 常用命令

### 开发相关

```bash
# 开发模式（热重载）
pnpm start:dev

# 调试模式
pnpm start:debug

# 生产构建
pnpm build

# 生产模式启动
pnpm start:prod
```

### 数据库相关

```bash
# 生成 Prisma 客户端
pnpm db:generate

# 创建新迁移
pnpm prisma migrate dev --name <migration-name>

# 运行迁移
pnpm db:migrate

# 重置数据库
pnpm db:migrate:reset

# 填充种子数据
pnpm db:seed

# 打开 Prisma Studio
pnpm db:studio
```

### Docker 相关

```bash
# 启动开发环境
pnpm docker:dev

# 停止开发环境
pnpm docker:dev:down

# 查看日志
pnpm docker:dev:logs

# 构建生产镜像
pnpm docker:build
```

### 代码质量

```bash
# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 类型检查
pnpm type-check
```

### 测试

```bash
# 单元测试
pnpm test

# 监听模式
pnpm test:watch

# 覆盖率报告
pnpm test:cov

# E2E 测试
pnpm test:e2e
```

---

## 🛠️ 故障排除

### 问题 1：数据库连接失败

**症状**：`Error: P1001: Can't reach database server`

**解决方案**：

1. 确保 Docker 已启动：`docker ps`
2. 检查端口 3306 是否被占用：

   ```bash
   # Windows
   netstat -ano | findstr :3306

   # Linux/macOS
   lsof -i :3306
   ```

3. 重启 Docker 容器：
   ```bash
   pnpm docker:dev:down
   pnpm docker:dev
   ```
4. 等待数据库完全启动（30 秒）

### 问题 2：Prisma 生成失败

**症状**：`Error: Prisma schema file not found`

**解决方案**：

1. 确保 `prisma/schema.prisma` 文件存在
2. 检查 `DATABASE_URL` 环境变量
3. 重新生成：
   ```bash
   pnpm db:generate
   ```

### 问题 3：端口被占用

**症状**：`Error: Port 3000 is already in use`

**解决方案**：

1. 查找占用进程：

   ```bash
   # Windows
   netstat -ano | findstr :3000

   # Linux/macOS
   lsof -i :3000
   ```

2. 停止进程或修改 `.env` 中的 `PORT` 配置

### 问题 4：权限问题（Linux/macOS）

**症状**：`Permission denied`

**解决方案**：

```bash
# 给脚本执行权限
chmod +x scripts/start.sh

# Docker 权限
sudo usermod -aG docker $USER
# 退出并重新登录
```

### 问题 5：依赖安装失败

**症状**：`npm ERR!` 或 `pnpm ERR!`

**解决方案**：

```bash
# 清理缓存
pnpm store prune

# 删除 node_modules 和 lock 文件
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

---

## 📚 下一步

环境搭建完成后，建议阅读：

1. [开发工作流](./development-workflow.md) - 学习日常开发流程
2. [架构概览](../architecture/overview.md) - 了解系统架构
3. [编码规范](./coding-standards.md) - 熟悉代码规范

---

## 🆘 获取帮助

如果遇到问题：

1. 查看本文档的故障排除部分
2. 查看日志文件：`logs/` 目录
3. 查看 Docker 容器日志：`docker logs <container-name>`
4. 查阅 [常见问题](../README.md#常见问题)
5. 创建 GitHub Issue

---

**维护者**: XSIJIE
**最后更新**: 2025-10-18
