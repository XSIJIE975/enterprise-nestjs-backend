# Docker 部署完整指南

> 📌 **维护者**: XSIJIE | **最后更新**: 2025-11-03

> 企业级 NestJS 后端系统 Docker 部署全面指南

## 📋 目录

- [快速开始](#快速开始)
- [环境说明](#环境说明)
- [配置规范](#配置规范)
  - [端口配置](#端口配置)
  - [命名规范](#命名规范)
- [环境部署](#环境部署)
  - [开发环境](#开发环境部署)
  - [测试环境](#测试环境部署)
  - [生产环境](#生产环境部署)
- [常用操作](#常用操作)
- [故障排查](#故障排查)
- [最佳实践](#最佳实践)

---

## 🚀 快速开始

### 前置要求

- ✅ Docker Desktop（或 Docker Engine）
- ✅ Docker Compose V2+
- ✅ pnpm 9.x

### 快速部署命令

```powershell
# 开发环境（仅基础设施）
pnpm docker:dev              # 启动 MySQL + Redis
pnpm start:dev               # 本地运行应用

# 测试环境（完整容器化）
.\scripts\deploy-test.ps1    # 一键部署

# 生产环境（完整容器化）
.\scripts\deploy-prod.ps1    # 一键部署（需确认）
```

---

## 🌍 环境说明

项目支持三种部署环境，各环境完全独立，互不冲突：

| 环境     | 应用端口 | 数据库端口 | Redis端口 | 配置文件           | Compose文件               |
| -------- | -------- | ---------- | --------- | ------------------ | ------------------------- |
| **开发** | 8000     | 3306       | 6379      | `.env.development` | `docker-compose.dev.yml`  |
| **测试** | 8001     | 3307       | 6380      | `.env.test`        | `docker-compose.test.yml` |
| **生产** | 8002     | 3306       | 6379      | `.env.production`  | `docker-compose.prod.yml` |

### 环境特点

#### 开发环境

- 仅运行 MySQL 和 Redis（基础设施）
- 应用在本地运行（支持热重载）
- 包含管理工具（Adminer、Redis Commander）
- 适合日常开发调试

#### 测试环境

- 完全容器化部署
- 独立端口避免与开发环境冲突
- 可与开发环境同时运行
- 适合集成测试和 CI/CD

#### 生产环境

- 完全容器化部署
- 优化的资源配置
- 完整的健康检查
- 适合线上部署

---

## ⚙️ 配置规范

### 端口配置

#### 应用端口规划

| 环境 | 端口   | 说明        |
| ---- | ------ | ----------- |
| 开发 | `8000` | 本地运行    |
| 测试 | `8001` | Docker 容器 |
| 生产 | `8002` | Docker 容器 |

#### 基础设施端口

**MySQL:**

- 开发: `3306` → 容器 `3306`
- 测试: `3307` → 容器 `3306` ⚠️ 避免冲突
- 生产: `3306` → 容器 `3306`

**Redis:**

- 开发: `6379` → 容器 `6379`
- 测试: `6380` → 容器 `6379` ⚠️ 避免冲突
- 生产: `6379` → 容器 `6379`

**管理工具（仅开发环境）:**

- Adminer: `8080` - MySQL 数据库管理
- Redis Commander: `8081` - Redis 管理界面

#### 端口映射说明

```yaml
ports:
  - '宿主机端口:容器端口'
  - '${PORT:-8001}:8001' # 优先使用环境变量，否则默认 8001
```

**规则：**

- 左边：宿主机端口（外部访问）
- 右边：容器内部端口（应用监听）

**示例：**

```yaml
# 测试环境
ports:
  - '8001:8001' # 宿主机 8001 → 容器 8001
  - '3307:3306' # 宿主机 3307 → 容器 3306
  - '6380:6379' # 宿主机 6380 → 容器 6379
```

---

### 命名规范

统一的命名规范确保资源清晰易管理，避免冲突。

#### 命名规则

| 资源类型   | 命名格式                    | 示例                        |
| ---------- | --------------------------- | --------------------------- |
| **项目名** | `enterprise-{环境}`         | `enterprise-dev`            |
| **容器名** | `enterprise-{服务}-{环境}`  | `enterprise-mysql-dev`      |
| **网络名** | `enterprise-{环境}-network` | `enterprise-dev-network`    |
| **卷名**   | `{项目名}_{服务}_data`      | `enterprise-dev_mysql_data` |

#### 完整资源清单

**开发环境:**

```
项目名: enterprise-dev
容器名:
  - enterprise-mysql-dev
  - enterprise-redis-dev
  - enterprise-adminer-dev
  - enterprise-redis-commander-dev
网络: enterprise-dev-network
卷:
  - enterprise-dev_mysql_data
  - enterprise-dev_redis_data
```

**测试环境:**

```
项目名: enterprise-test
容器名:
  - enterprise-app-test
  - enterprise-mysql-test
  - enterprise-redis-test
网络: enterprise-test-network
卷:
  - enterprise-test_mysql_data
  - enterprise-test_redis_data
```

**生产环境:**

```
项目名: enterprise-prod
容器名:
  - enterprise-app-prod
  - enterprise-mysql-prod
  - enterprise-redis-prod
网络: enterprise-prod-network
卷:
  - enterprise-prod_mysql_data
  - enterprise-prod_redis_data
```

#### 命名规范优势

✅ **清晰易识别** - 一眼看出环境和服务

```bash
enterprise-mysql-dev      # 开发环境的 MySQL
enterprise-mysql-test     # 测试环境的 MySQL
enterprise-mysql-prod     # 生产环境的 MySQL
```

✅ **避免冲突** - 可同时运行多个环境

```bash
docker ps
# enterprise-mysql-dev      运行中
# enterprise-mysql-test     运行中
# 不会因容器名冲突而启动失败
```

✅ **便于管理** - 快速筛选和操作

```bash
docker ps --filter "name=enterprise-dev"     # 查看开发环境
docker network ls | findstr enterprise-test  # 查看测试网络
docker volume ls | findstr enterprise-prod   # 查看生产卷
```

---

## 💡 项目名称说明

### Docker Compose 项目名称

Docker Compose 会为每个部署创建项目，项目名称用于资源命名。

**默认行为：**

- 如果不指定，使用**当前目录名**作为项目名
- 例如：目录 `enterprise-nestjs-backend` → 项目名 `enterprise-nestjs-backend`

**自定义项目名（推荐）：**

```yaml
# docker-compose.dev.yml
version: '3.8'

name: enterprise-dev # 自定义项目名

services:
  mysql:
    # ...
```

**项目名的作用：**

- 网络命名：`{项目名}_default` 或自定义网络名
- 卷命名：`{项目名}_{服务}_data`
- 容器命名：`{项目名}_{服务}_序号`（如未指定 container_name）

**三种自定义方法：**

1. **在 docker-compose 文件中配置**（✅ 推荐）

   ```yaml
   name: enterprise-dev
   ```

2. **使用命令行参数 `-p`**

   ```bash
   docker-compose -p myproject up -d
   ```

3. **使用环境变量**
   ```bash
   export COMPOSE_PROJECT_NAME=myproject
   docker-compose up -d
   ```

---

## 📝 环境变量配置

### 配置文件说明

每个环境有独立的配置文件：

| 文件               | 说明     | 重要配置    |
| ------------------ | -------- | ----------- |
| `.env.development` | 开发环境 | `PORT=8000` |
| `.env.test`        | 测试环境 | `PORT=8001` |
| `.env.production`  | 生产环境 | `PORT=8002` |

### 配置加载逻辑

#### 非 Docker 部署

```typescript
// src/app.module.ts
ConfigModule.forRoot({
  envFilePath: [
    `.env.${process.env.NODE_ENV}`, // 优先级最高
    '.env.local',
    '.env',
  ],
});
```

执行流程：

```bash
pnpm start:prod  # 设置 NODE_ENV=production
↓
加载 .env.production  # 自动读取
↓
应用启动
```

#### Docker 部署

```yaml
# docker-compose.prod.yml
services:
  app:
    env_file:
      - .env.production # 从文件加载
    environment:
      # 覆盖特定配置（Docker 内部网络）
      - DATABASE_URL=mysql://user:pass@mysql:3306/db
```

执行流程：

```bash
docker-compose up
↓
读取 .env.production
↓
注入到容器环境变量
↓
应用读取环境变量启动
```

---

## 🚢 环境部署

### 开发环境部署

开发环境只运行基础设施，应用在本地运行，支持热重载。

#### 1. 准备工作

```powershell
# 复制环境配置文件（如不存在）
if (!(Test-Path .env.development)) { Copy-Item .env.example .env.development }

# 配置数据库连接（本地访问）
# .env.development 中确保：
# DATABASE_URL="mysql://root:root_password@localhost:3306/nestjs_db"
# REDIS_HOST=localhost
# REDIS_PORT=6379
```

#### 2. 启动基础设施

```powershell
# 方式一：使用 pnpm 脚本（推荐）
pnpm docker:dev

# 方式二：直接使用 docker compose
docker compose -f docker-compose.dev.yml up -d
```

#### 3. 数据库初始化

```powershell
# Prisma 迁移
pnpm db:migrate

# 可选：填充种子数据
pnpm db:seed
```

#### 4. 启动应用

```powershell
# 开发模式（热重载）
pnpm start:dev
```

#### 5. 访问管理工具

- **应用接口**: http://localhost:8000
- **Swagger 文档**: http://localhost:8000/api/docs
- **Adminer (MySQL)**: http://localhost:8080
  - 服务器: `mysql`
  - 用户名: `root`
  - 密码: `root_password`
  - 数据库: `nestjs_db`
- **Redis Commander**: http://localhost:8081

#### 6. 停止服务

```powershell
# 停止基础设施
pnpm docker:dev:down

# 或者
docker compose -f docker-compose.dev.yml down
```

---

### 测试环境部署

测试环境完全容器化，适合集成测试和 CI/CD。

#### 1. 准备配置

```powershell
# 检查配置文件
if (!(Test-Path .env.test)) {
  Copy-Item .env.example .env.test
  Write-Host "⚠️  请编辑 .env.test 并设置 PORT=8001"
}

# 关键配置确认：
# .env.test
PORT=8001
DATABASE_URL="mysql://root:root_password@localhost:3307/nestjs_test"
REDIS_HOST=localhost
REDIS_PORT=6380
```

#### 2. 构建镜像

```powershell
# 使用 NODE_ENV=test 构建
pnpm docker:build:test

# 或手动构建
docker build --build-arg NODE_ENV=test -t enterprise-nestjs-backend:test .
```

#### 3. 启动容器

```powershell
# 方式一：使用脚本（推荐）
.\scripts\deploy-test.ps1

# 方式二：直接使用 docker compose
docker compose -f docker-compose.test.yml up -d
```

脚本会自动执行：

1. 检查配置文件
2. 构建应用镜像
3. 启动所有容器
4. 等待服务就绪
5. 执行数据库迁移
6. 显示服务状态

#### 4. 验证部署

```powershell
# 查看容器状态
docker compose -f docker-compose.test.yml ps

# 查看应用日志
docker compose -f docker-compose.test.yml logs app

# 健康检查
curl http://localhost:8001/health
curl http://localhost:8001/health/db
```

#### 5. 运行测试

```powershell
# 在测试环境运行 E2E 测试
pnpm test:e2e

# 查看测试覆盖率
pnpm test:cov
```

#### 6. 停止和清理

```powershell
# 停止容器
docker compose -f docker-compose.test.yml down

# 清理包括卷（⚠️ 会删除数据）
docker compose -f docker-compose.test.yml down -v
```

---

### 生产环境部署

生产环境完全容器化，包含完整的健康检查和资源限制。

#### 1. 准备配置

```powershell
# 复制生产配置模板
if (!(Test-Path .env.production)) {
  Copy-Item .env.example .env.production
  Write-Host "🔒 请立即更新 .env.production 中的敏感信息！"
}
```

**⚠️ 生产配置检查清单：**

```ini
# .env.production
PORT=8002

# 数据库（修改密码！）
DATABASE_URL="mysql://root:CHANGE_THIS_PASSWORD@mysql:3306/nestjs_db"
DB_ROOT_PASSWORD=CHANGE_THIS_PASSWORD

# Redis（修改密码！）
REDIS_PASSWORD=CHANGE_THIS_PASSWORD

# JWT（生成强密钥！）
JWT_SECRET=CHANGE_TO_STRONG_SECRET_AT_LEAST_32_CHARS
JWT_REFRESH_SECRET=CHANGE_TO_ANOTHER_STRONG_SECRET

# 邮件配置
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your-email@example.com
MAIL_PASSWORD=your-email-password

# 日志
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_DIR=/app/logs
```

#### 2. 构建生产镜像

```powershell
# 使用 NODE_ENV=production 构建
pnpm docker:build:prod

# 或手动构建
docker build --build-arg NODE_ENV=production -t enterprise-nestjs-backend:latest .
```

镜像构建包含：

- ✅ 多阶段构建优化
- ✅ 依赖安装（仅生产依赖）
- ✅ TypeScript 编译
- ✅ Prisma Client 生成
- ✅ 非 root 用户运行

#### 3. 部署启动

```powershell
# 使用部署脚本（推荐）
.\scripts\deploy-prod.ps1

# 脚本会要求确认，输入 'yes' 继续
```

部署流程：

1. ⚠️ 部署确认提示
2. 📋 检查配置文件
3. 🏗️ 构建生产镜像
4. 🚀 启动容器（使用 .env.production）
5. ⏳ 等待服务就绪（健康检查）
6. 🗄️ 执行数据库迁移
7. ✅ 显示部署状态

#### 4. 验证部署

```powershell
# 检查容器状态
docker compose -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 健康检查
curl http://localhost:8002/health
curl http://localhost:8002/health/db
curl http://localhost:8002/health/redis

# 查看 Swagger 文档（如果启用）
# http://localhost:8002/api/docs
```

#### 5. 监控和日志

```powershell
# 实时日志
docker compose -f docker-compose.prod.yml logs -f app

# 查看最近 100 行日志
docker compose -f docker-compose.prod.yml logs --tail=100 app

# 查看容器资源使用
docker stats enterprise-app-prod

# 进入容器检查
docker exec -it enterprise-app-prod sh
```

#### 6. 更新部署

```powershell
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建镜像
pnpm docker:build:prod

# 3. 重启服务（零停机需要配合负载均衡）
docker compose -f docker-compose.prod.yml up -d --no-deps app

# 4. 查看更新后的日志
docker compose -f docker-compose.prod.yml logs -f app
```

#### 7. 备份数据

```powershell
# 备份 MySQL 数据库
docker exec enterprise-mysql-prod mysqldump -u root -p nestjs_db > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# 备份 Redis 数据
docker exec enterprise-redis-prod redis-cli --rdb /data/dump.rdb
docker cp enterprise-redis-prod:/data/dump.rdb ./redis_backup_$(Get-Date -Format "yyyyMMdd_HHmmss").rdb
```

#### 8. 停止和清理

```powershell
# 停止所有服务
docker compose -f docker-compose.prod.yml down

# ⚠️ 删除包括数据卷（危险操作！）
docker compose -f docker-compose.prod.yml down -v
```

---

## 🔧 常用操作

### Docker Compose 命令速查

#### 启动和停止

```powershell
# 启动服务（后台运行）
docker compose -f docker-compose.{env}.yml up -d

# 启动并查看日志
docker compose -f docker-compose.{env}.yml up

# 停止服务
docker compose -f docker-compose.{env}.yml down

# 停止并删除卷（⚠️ 数据会丢失）
docker compose -f docker-compose.{env}.yml down -v

# 重启服务
docker compose -f docker-compose.{env}.yml restart

# 重启单个服务
docker compose -f docker-compose.{env}.yml restart app
```

#### 查看状态

```powershell
# 查看运行中的容器
docker compose -f docker-compose.{env}.yml ps

# 查看所有容器（包括停止的）
docker compose -f docker-compose.{env}.yml ps -a

# 查看资源使用
docker stats

# 查看特定环境的容器
docker ps --filter "name=enterprise-dev"
docker ps --filter "name=enterprise-test"
docker ps --filter "name=enterprise-prod"
```

#### 日志查看

```powershell
# 查看所有服务日志
docker compose -f docker-compose.{env}.yml logs

# 实时跟踪日志
docker compose -f docker-compose.{env}.yml logs -f

# 查看特定服务日志
docker compose -f docker-compose.{env}.yml logs app
docker compose -f docker-compose.{env}.yml logs mysql

# 查看最近 N 行日志
docker compose -f docker-compose.{env}.yml logs --tail=100 app

# 查看带时间戳的日志
docker compose -f docker-compose.{env}.yml logs -t app
```

#### 容器操作

```powershell
# 进入容器 Shell
docker exec -it enterprise-app-{env} sh

# 在容器中执行命令
docker exec enterprise-app-{env} node --version
docker exec enterprise-app-{env} npm list

# 查看容器详细信息
docker inspect enterprise-app-{env}

# 复制文件到容器
docker cp ./local-file.txt enterprise-app-prod:/app/

# 从容器复制文件
docker cp enterprise-app-prod:/app/logs ./local-logs
```

---

### npm 脚本速查

#### 开发环境

```powershell
# 启动基础设施
pnpm docker:dev

# 停止基础设施
pnpm docker:dev:down

# 查看日志
pnpm docker:dev:logs

# 启动应用（本地）
pnpm start:dev
```

#### 测试环境

```powershell
# 构建测试镜像
pnpm docker:build:test

# 启动测试环境
pnpm docker:test

# 停止测试环境
pnpm docker:test:down

# 查看测试日志
pnpm docker:test:logs
```

#### 生产环境

```powershell
# 构建生产镜像
pnpm docker:build:prod

# 启动生产环境
pnpm docker:prod

# 停止生产环境
pnpm docker:prod:down

# 查看生产日志
pnpm docker:prod:logs

# 使用脚本部署（推荐）
.\scripts\deploy-prod.ps1
```

#### 数据库操作

```powershell
# Prisma 迁移
pnpm db:migrate

# 生成 Prisma Client
pnpm db:generate

# 查看迁移状态
pnpm db:status

# 重置数据库（⚠️ 会删除所有数据）
pnpm db:reset

# 填充种子数据
pnpm db:seed

# 打开 Prisma Studio
pnpm db:studio
```

---

### Docker 清理命令

#### 清理未使用的资源

```powershell
# 清理停止的容器
docker container prune

# 清理未使用的镜像
docker image prune

# 清理未使用的卷
docker volume prune

# 清理未使用的网络
docker network prune

# 一键清理所有未使用资源（⚠️ 慎用）
docker system prune

# 清理包括未使用的镜像
docker system prune -a

# 查看 Docker 磁盘使用
docker system df
```

#### 清理特定项目资源

```powershell
# 停止并删除开发环境
docker compose -f docker-compose.dev.yml down -v

# 删除项目镜像
docker rmi enterprise-nestjs-backend:test
docker rmi enterprise-nestjs-backend:latest

# 删除特定网络
docker network rm enterprise-dev-network

# 删除特定卷
docker volume rm enterprise-dev_mysql_data
```

---

## 🔍 故障排查

### 常见问题

#### 1. 端口冲突

**现象：**

```
Error: bind: address already in use
```

**原因：** 端口被其他服务占用

**解决方法：**

```powershell
# 查看端口占用（Windows）
netstat -ano | findstr :8000
netstat -ano | findstr :3306
netstat -ano | findstr :6379

# 查找进程
Get-Process -Id <PID>

# 停止冲突的 Docker 容器
docker ps | findstr 8000
docker stop <容器ID>

# 修改配置文件端口
# 编辑 .env.{环境} 和对应的 docker-compose.{环境}.yml
```

#### 2. 容器启动失败

**现象：**

```
Error: container exited with code 1
```

**排查步骤：**

```powershell
# 1. 查看容器日志
docker compose -f docker-compose.{env}.yml logs app

# 2. 查看容器最后的错误
docker logs enterprise-app-{env} --tail=50

# 3. 尝试交互式启动
docker run -it --rm enterprise-nestjs-backend:latest sh

# 4. 检查配置文件
# 确保 .env.{环境} 存在且配置正确

# 5. 检查健康检查
docker inspect enterprise-app-{env} | findstr Health
```

**常见原因：**

- ❌ 环境变量配置错误
- ❌ 数据库连接失败
- ❌ 端口冲突
- ❌ 镜像构建失败

#### 3. 数据库连接失败

**现象：**

```
Error: Can't reach database server at `mysql:3306`
Error: ECONNREFUSED 127.0.0.1:3306
```

**解决方法：**

```powershell
# 1. 检查 MySQL 容器状态
docker ps | findstr mysql

# 2. 查看 MySQL 日志
docker logs enterprise-mysql-{env}

# 3. 测试数据库连接
docker exec -it enterprise-mysql-{env} mysql -u root -p

# 4. 检查网络连接
docker network inspect enterprise-{env}-network

# 5. 确认配置正确
# Docker 环境使用服务名：mysql:3306
# 本地开发使用：localhost:3306
```

**配置示例：**

```ini
# docker-compose 环境
DATABASE_URL="mysql://root:password@mysql:3306/nestjs_db"

# 本地开发环境
DATABASE_URL="mysql://root:password@localhost:3306/nestjs_db"
```

#### 4. Redis 连接失败

**现象：**

```
Error: connect ECONNREFUSED redis:6379
```

**解决方法：**

```powershell
# 1. 检查 Redis 容器
docker ps | findstr redis

# 2. 测试 Redis 连接
docker exec -it enterprise-redis-{env} redis-cli ping
# 应返回 PONG

# 3. 检查 Redis 日志
docker logs enterprise-redis-{env}

# 4. 验证配置
# .env.{环境}
REDIS_HOST=redis  # Docker 环境
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

#### 5. 镜像构建失败

**现象：**

```
Error: failed to solve: process "/bin/sh -c pnpm install" did not complete successfully
```

**解决方法：**

```powershell
# 1. 清理构建缓存
docker builder prune

# 2. 无缓存重新构建
docker build --no-cache -t enterprise-nestjs-backend:latest .

# 3. 检查 Dockerfile 语法
# 确保多阶段构建正确

# 4. 检查网络连接
# pnpm install 需要网络连接

# 5. 使用国内镜像源
# 在 Dockerfile 中添加：
# RUN npm config set registry https://registry.npmmirror.com
```

#### 6. Prisma 迁移失败

**现象：**

```
Error: P1001: Can't reach database server
Error: Migration failed
```

**解决方法：**

```powershell
# 1. 确保数据库容器运行
docker ps | findstr mysql

# 2. 等待数据库就绪
Start-Sleep -Seconds 10

# 3. 手动执行迁移
docker exec enterprise-app-{env} npx prisma migrate deploy

# 4. 检查迁移状态
docker exec enterprise-app-{env} npx prisma migrate status

# 5. 重置数据库（⚠️ 开发环境）
docker exec enterprise-app-{env} npx prisma migrate reset --force
```

#### 7. 容器无法访问外部网络

**现象：**

```
Error: getaddrinfo ENOTFOUND smtp.gmail.com
```

**解决方法：**

```powershell
# 1. 检查 Docker 网络配置
docker network ls

# 2. 测试容器网络连接
docker exec enterprise-app-{env} ping -c 3 8.8.8.8
docker exec enterprise-app-{env} nslookup google.com

# 3. 检查 DNS 配置
# 在 docker-compose.yml 中添加：
services:
  app:
    dns:
      - 8.8.8.8
      - 8.8.4.4
```

#### 8. 日志文件过大

**现象：** Docker 磁盘空间不足

**解决方法：**

```powershell
# 1. 检查容器日志大小
docker ps -a --format "table {{.Names}}\t{{.Size}}"

# 2. 清理日志
docker logs enterprise-app-{env} --tail 0 > $null 2>&1

# 3. 配置日志轮转（在 docker-compose.yml）
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

### 调试技巧

#### 1. 交互式调试

```powershell
# 进入运行中的容器
docker exec -it enterprise-app-{env} sh

# 查看进程
ps aux

# 查看环境变量
env | sort

# 查看文件系统
ls -la /app
cat /app/.env
```

#### 2. 查看构建过程

```powershell
# 详细构建日志
docker build --progress=plain -t enterprise-nestjs-backend:latest .

# 查看镜像层
docker history enterprise-nestjs-backend:latest

# 检查镜像内容
docker run --rm -it enterprise-nestjs-backend:latest sh
```

#### 3. 网络调试

```powershell
# 查看容器 IP
docker inspect enterprise-app-{env} | findstr IPAddress

# 查看网络详情
docker network inspect enterprise-{env}-network

# 测试容器间连接
docker exec enterprise-app-{env} ping mysql
docker exec enterprise-app-{env} nc -zv mysql 3306
```

#### 4. 性能分析

```powershell
# 实时资源监控
docker stats enterprise-app-{env}

# 容器进程
docker top enterprise-app-{env}

# 查看容器事件
docker events --filter container=enterprise-app-{env}
```

---

## 📚 最佳实践

### 安全最佳实践

#### 1. 敏感信息管理

**❌ 不要这样做：**

```yaml
# docker-compose.prod.yml
environment:
  - DATABASE_PASSWORD=my_password_123 # 硬编码密码
  - JWT_SECRET=secret123 # 硬编码密钥
```

**✅ 应该这样做：**

```yaml
# docker-compose.prod.yml
env_file:
  - .env.production  # 从文件加载

# .env.production（添加到 .gitignore）
DATABASE_PASSWORD=${DB_PASSWORD:-changeme}
JWT_SECRET=${JWT_SECRET:-must_be_changed}
```

#### 2. 镜像安全

```dockerfile
# ✅ 使用官方基础镜像
FROM node:22-alpine

# ✅ 使用非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
USER nestjs

# ✅ 最小化镜像层
RUN apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# ✅ 健康检查
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1
```

#### 3. 网络隔离

```yaml
# ✅ 使用自定义网络
networks:
  enterprise-prod-network:
    driver: bridge
    internal: false # 允许外部访问（如需隔离设为 true）

services:
  app:
    networks:
      - enterprise-prod-network
  mysql:
    networks:
      - enterprise-prod-network
    # MySQL 不暴露端口到宿主机（仅内部访问）
```

#### 4. 资源限制

```yaml
# ✅ 设置资源限制
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

---

### 性能优化

#### 1. 镜像构建优化

```dockerfile
# ✅ 利用构建缓存
# 先复制依赖文件，后复制源码
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ✅ 使用 .dockerignore
# 减少构建上下文
```

**.dockerignore 示例：**

```
node_modules
dist
logs
*.log
.env*
.git
.vscode
coverage
test
```

#### 2. 多阶段构建

```dockerfile
# ✅ 多阶段构建减小镜像体积
# 阶段 1: 构建
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN pnpm install
COPY . .
RUN pnpm build

# 阶段 2: 生产
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/main.js"]
```

#### 3. 缓存策略

```typescript
// ✅ 合理使用 Redis 缓存
@Injectable()
export class UserService {
  constructor(private cacheService: CacheService) {}

  async getUserById(id: string) {
    // 先查缓存
    const cached = await this.cacheService.get(`user:${id}`);
    if (cached) return cached;

    // 查数据库
    const user = await this.prisma.user.findUnique({ where: { id } });

    // 写入缓存（TTL 5分钟）
    await this.cacheService.set(`user:${id}`, user, 300);
    return user;
  }
}
```

#### 4. 数据库连接池

```typescript
// ✅ 配置合理的连接池
// prisma/schema.prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")

  // 连接池配置
  pool_size = 10
  pool_timeout = 10
  connection_limit = 10
}
```

---

### 运维最佳实践

#### 1. 健康检查

```yaml
# ✅ 配置健康检查
services:
  app:
    healthcheck:
      test: ['CMD', 'node', 'healthcheck.js']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

```typescript
// healthcheck.js
const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 8002,
  path: '/health',
  timeout: 2000,
};

const req = http.request(options, res => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => process.exit(1));
req.on('timeout', () => process.exit(1));
req.end();
```

#### 2. 日志管理

```yaml
# ✅ 配置日志轮转
services:
  app:
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '5'
        compress: 'true'
```

```typescript
// ✅ 结构化日志
logger.info('User login', {
  userId: user.id,
  email: user.email,
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  timestamp: new Date().toISOString(),
});
```

#### 3. 监控和告警

```yaml
# ✅ 使用标签便于监控
services:
  app:
    labels:
      - 'com.example.environment=production'
      - 'com.example.service=api'
      - 'com.example.version=1.0.0'
```

#### 4. 备份策略

```powershell
# ✅ 定期备份脚本
# backup-prod.ps1

$DATE = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_DIR = ".\backups\$DATE"

# 创建备份目录
New-Item -ItemType Directory -Path $BACKUP_DIR -Force

# 备份 MySQL
docker exec enterprise-mysql-prod mysqldump -u root -p$env:DB_ROOT_PASSWORD nestjs_db > "$BACKUP_DIR\mysql_backup.sql"

# 备份 Redis
docker exec enterprise-redis-prod redis-cli --rdb /data/dump.rdb
docker cp enterprise-redis-prod:/data/dump.rdb "$BACKUP_DIR\redis_backup.rdb"

# 备份配置文件
Copy-Item .env.production "$BACKUP_DIR\.env.production.bak"

Write-Host "✅ 备份完成: $BACKUP_DIR"
```

#### 5. 零停机更新

```powershell
# ✅ 滚动更新策略

# 1. 构建新镜像
docker build -t enterprise-nestjs-backend:v2 .

# 2. 启动新容器（不同端口）
docker run -d --name app-v2 -p 8003:8002 enterprise-nestjs-backend:v2

# 3. 健康检查
curl http://localhost:8003/health

# 4. 切换流量（需配合 Nginx/Traefik）
# 更新负载均衡配置

# 5. 停止旧容器
docker stop enterprise-app-prod

# 6. 清理旧容器
docker rm enterprise-app-prod
```

---

### CI/CD 集成

#### GitHub Actions 示例

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Build Docker image
        run: |
          docker build \
            --build-arg NODE_ENV=production \
            -t enterprise-nestjs-backend:${{ github.sha }} \
            -t enterprise-nestjs-backend:latest \
            .

      - name: Run tests
        run: docker run --rm enterprise-nestjs-backend:${{ github.sha }} pnpm test

      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push enterprise-nestjs-backend:${{ github.sha }}
          docker push enterprise-nestjs-backend:latest

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /app/enterprise-nestjs-backend
            git pull
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d
```

---

## 📖 附录

### A. 完整配置文件示例

#### .env.production 模板

```ini
# ============================================
# 应用配置
# ============================================
NODE_ENV=production
PORT=8002
APP_NAME="Enterprise NestJS Backend"
APP_VERSION=1.0.0

# ============================================
# 数据库配置
# ============================================
DATABASE_URL="mysql://root:${DB_ROOT_PASSWORD}@mysql:3306/nestjs_db"
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=nestjs_db
DB_USERNAME=root
DB_ROOT_PASSWORD=CHANGE_THIS_PASSWORD

# ============================================
# Redis 配置
# ============================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_THIS_PASSWORD
REDIS_DB=0

# ============================================
# JWT 配置
# ============================================
JWT_SECRET=CHANGE_TO_STRONG_SECRET_AT_LEAST_32_CHARS
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=CHANGE_TO_ANOTHER_STRONG_SECRET
JWT_REFRESH_EXPIRES_IN=30d

# ============================================
# 日志配置
# ============================================
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_DIR=/app/logs
LOG_MAX_FILES=30

# ============================================
# 时区配置
# ============================================
TZ=Asia/Shanghai
DEFAULT_TIMEZONE=Asia/Shanghai

# ============================================
# CORS 配置
# ============================================
CORS_ENABLED=true
CORS_ORIGIN=https://example.com

# ============================================
# 限流配置
# ============================================
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# ============================================
# 文件上传
# ============================================
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=5242880

# ============================================
# 邮件配置
# ============================================
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@example.com
MAIL_PASSWORD=your-email-password
MAIL_FROM="Enterprise NestJS <noreply@example.com>"
```

---

### B. 端口占用检查脚本

```powershell
# check-ports.ps1
$ports = @(8000, 8001, 8002, 3306, 3307, 6379, 6380, 8080, 8081)

Write-Host "🔍 检查端口占用情况..." -ForegroundColor Cyan
Write-Host ""

foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

    if ($connection) {
        $process = Get-Process -Id $connection.OwningProcess
        Write-Host "❌ 端口 $port 被占用" -ForegroundColor Red
        Write-Host "   进程: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Yellow
    } else {
        Write-Host "✅ 端口 $port 可用" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "💡 提示: 如需释放端口，使用以下命令停止进程:" -ForegroundColor Cyan
Write-Host "   Stop-Process -Id <PID>" -ForegroundColor Yellow
```

---

### C. Docker Compose 配置参考

#### docker-compose.prod.yml 完整示例

```yaml
version: '3.8'

name: enterprise-prod

services:
  app:
    container_name: enterprise-app-prod
    image: enterprise-nestjs-backend:latest
    env_file:
      - .env.production
    environment:
      - DATABASE_URL=mysql://root:${DB_ROOT_PASSWORD}@mysql:3306/${DB_DATABASE}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    ports:
      - '${PORT:-8002}:8002'
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'node', 'healthcheck.js']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - enterprise-prod-network
    volumes:
      - ./logs:/app/logs
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '5'
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M

  mysql:
    container_name: enterprise-mysql-prod
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=${DB_DATABASE}
      - TZ=Asia/Shanghai
    ports:
      - '3306:3306'
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
    command: --default-authentication-plugin=mysql_native_password
    restart: unless-stopped
    healthcheck:
      test:
        [
          'CMD',
          'mysqladmin',
          'ping',
          '-h',
          'localhost',
          '-u',
          'root',
          '-p${DB_ROOT_PASSWORD}',
        ]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - enterprise-prod-network

  redis:
    container_name: enterprise-redis-prod
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - enterprise-prod-network

networks:
  enterprise-prod-network:
    driver: bridge

volumes:
  mysql_data:
  redis_data:
```

---

### D. 相关文档链接

#### 官方文档

- [Docker 文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [NestJS 文档](https://docs.nestjs.com/)
- [Prisma 文档](https://www.prisma.io/docs)

#### 项目内部文档

- [架构概览](../architecture/overview.md)
- [开发工作流](./development-workflow.md)
- [编码规范](./coding-standards.md)
- [时区使用指南](./timezone-aware-date-query.md)

---

### E. 常用命令速查表

| 操作     | 开发环境                                           | 测试环境                                            | 生产环境                                            |
| -------- | -------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------- |
| **启动** | `pnpm docker:dev`                                  | `pnpm docker:test`                                  | `.\scripts\deploy-prod.ps1`                         |
| **停止** | `pnpm docker:dev:down`                             | `pnpm docker:test:down`                             | `pnpm docker:prod:down`                             |
| **日志** | `pnpm docker:dev:logs`                             | `pnpm docker:test:logs`                             | `pnpm docker:prod:logs`                             |
| **重启** | `docker compose -f docker-compose.dev.yml restart` | `docker compose -f docker-compose.test.yml restart` | `docker compose -f docker-compose.prod.yml restart` |
| **构建** | N/A（本地运行）                                    | `pnpm docker:build:test`                            | `pnpm docker:build:prod`                            |

---

### F. 故障排查检查清单

部署前检查：

- [ ] 配置文件存在且正确（`.env.{环境}`）
- [ ] 端口未被占用
- [ ] Docker 服务运行中
- [ ] 磁盘空间充足（至少 5GB）
- [ ] 网络连接正常

部署后验证：

- [ ] 所有容器运行中（`docker ps`）
- [ ] 健康检查通过（`/health`）
- [ ] 数据库连接正常（`/health/db`）
- [ ] Redis 连接正常（`/health/redis`）
- [ ] 日志无错误信息
- [ ] API 接口响应正常

---

## 🎉 总结

本文档涵盖了企业级 NestJS 后端系统的完整 Docker 部署流程：

✅ **多环境支持** - 开发、测试、生产环境独立部署
✅ **标准化命名** - 统一的资源命名规范
✅ **安全配置** - 敏感信息分离，网络隔离
✅ **详细文档** - 从快速开始到故障排查全覆盖
✅ **最佳实践** - 性能优化、运维建议、CI/CD 集成

### 快速上手

```powershell
# 开发环境（2 步）
pnpm docker:dev
pnpm start:dev

# 测试环境（1 步）
.\scripts\deploy-test.ps1

# 生产环境（1 步）
.\scripts\deploy-prod.ps1
```

---
