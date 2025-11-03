# CI/CD 配置说明

> 📌 **维护者**: XSIJIE | **最后更新**: 2025-11-03

## 📋 概述

本项目使用 GitHub Actions 实现自动化 CI/CD 流程，包含代码检查、测试、构建、Docker 镜像发布和安全扫描。

## 🔄 工作流触发条件

- **Push**: 推送到 `main` 或 `develop` 分支
- **Pull Request**: 针对 `main` 或 `develop` 分支的 PR

## 🚀 工作流任务

### 1. Test & Lint（测试和代码检查）

**运行条件**: 所有 push 和 PR

**执行步骤**:

1. ✅ 检出代码
2. ✅ 设置 pnpm 和 Node.js 22
3. ✅ 安装依赖
4. ✅ 生成 Prisma Client
5. ✅ 执行数据库迁移
6. ✅ TypeScript 类型检查
7. ✅ ESLint 代码检查
8. ✅ Prettier 格式检查
9. ✅ 运行单元测试（带覆盖率）
10. ✅ 上传覆盖率报告到 Codecov

**环境服务**:

- MySQL 8.0（端口 3306）
- Redis 7-alpine（端口 6379）

### 2. Build Application（构建应用）

**运行条件**: Test & Lint 任务成功后

**执行步骤**:

1. ✅ 检出代码
2. ✅ 设置环境
3. ✅ 安装依赖
4. ✅ 生成 Prisma Client
5. ✅ 构建应用（TypeScript → JavaScript）
6. ✅ 检查构建产物
7. ✅ 上传构建产物（保留 7 天）

### 3. Docker Build & Push（Docker 镜像构建和推送）

**运行条件**:

- Test & Lint 和 Build 任务都成功
- 仅在推送到 `main` 分支时执行
- 需要配置 Docker Hub 密钥

**执行步骤**:

1. ✅ 检出代码
2. ✅ 设置 Docker Buildx
3. ✅ 登录 Docker Hub
4. ✅ 提取元数据（生成标签）
5. ✅ 构建并推送 Docker 镜像

**镜像标签**:

- `latest` - 最新主分支版本
- `main-<commit-sha>` - 特定提交版本

### 4. Security Scan（安全扫描）

**运行条件**:

- Test & Lint 任务成功后
- 仅在 push 事件时执行

**执行步骤**:

1. ✅ 检出代码
2. ✅ 运行 Trivy 漏洞扫描（文件系统）
3. ✅ 上传扫描结果到 GitHub Security 标签
4. ✅ 输出扫描摘要

**扫描级别**: CRITICAL 和 HIGH

---

## ⚙️ 配置要求

### GitHub Secrets

需要在仓库设置中配置以下 Secrets（Settings → Secrets and variables → Actions）:

| Secret            | 说明                | 是否必需                   |
| ----------------- | ------------------- | -------------------------- |
| `DOCKER_USERNAME` | Docker Hub 用户名   | 可选（仅用于 Docker 推送） |
| `DOCKER_PASSWORD` | Docker Hub 访问令牌 | 可选（仅用于 Docker 推送） |

**Docker Hub 配置步骤**:

1. 登录 [Docker Hub](https://hub.docker.com/)
2. 前往 Account Settings → Security → Access Tokens
3. 创建新的 Access Token
4. 复制 Token 并在 GitHub 仓库中添加为 Secret

### 环境变量

CI/CD 环境使用以下测试数据库配置：

```env
DATABASE_URL=mysql://root:test_root_password@localhost:3306/nestjs_test
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=test-jwt-secret-for-ci-cd-pipeline-must-be-at-least-32-chars
```

这些配置在 `.github/workflows/ci-cd.yml` 中硬编码，无需额外配置。

---

## 📊 状态徽章

可以在 README.md 中添加以下徽章：

```markdown
![CI/CD](https://github.com/your-username/enterprise-nestjs-backend/workflows/CI/CD%20Pipeline/badge.svg)
![Test Coverage](https://codecov.io/gh/your-username/enterprise-nestjs-backend/branch/main/graph/badge.svg)
```

---

## 🔍 查看工作流结果

1. 进入 GitHub 仓库页面
2. 点击顶部的 **Actions** 标签
3. 选择对应的工作流运行记录
4. 查看各个任务的执行日志

---

## 🛠️ 本地测试 CI 流程

可以在本地模拟 CI 环境运行测试：

```powershell
# 1. 启动测试数据库
docker run -d --name mysql-test -e MYSQL_ROOT_PASSWORD=test_root_password -e MYSQL_DATABASE=nestjs_test -p 3306:3306 mysql:8.0
docker run -d --name redis-test -p 6379:6379 redis:7-alpine

# 2. 等待数据库就绪
Start-Sleep -Seconds 10

# 3. 安装依赖
pnpm install

# 4. 生成 Prisma Client
$env:DATABASE_URL="mysql://root:test_root_password@localhost:3306/nestjs_test"
pnpm db:generate

# 5. 执行迁移
npx prisma migrate deploy

# 6. 类型检查
pnpm type-check

# 7. 代码检查
pnpm lint

# 8. 格式检查
pnpm format:check

# 9. 运行测试
$env:NODE_ENV="test"
$env:DATABASE_URL="mysql://root:test_root_password@localhost:3306/nestjs_test"
$env:REDIS_HOST="localhost"
$env:REDIS_PORT="6379"
$env:JWT_SECRET="test-jwt-secret-for-ci-cd-pipeline-must-be-at-least-32-chars"
$env:JWT_REFRESH_SECRET="test-jwt-refresh-secret-for-ci-cd-pipeline-must-be-at-least-32-chars"
pnpm test:cov

# 10. 构建
pnpm build

# 11. 清理
docker stop mysql-test redis-test
docker rm mysql-test redis-test
```

---

## 🐛 常见问题

### 1. 测试失败：数据库连接错误

**原因**: MySQL 服务未完全启动

**解决**:

- 检查 GitHub Actions 日志中 MySQL 健康检查状态
- 增加 `health-retries` 次数
- 确保 `DATABASE_URL` 配置正确

### 2. Docker 推送失败

**原因**: Docker Hub 认证失败

**解决**:

- 检查 `DOCKER_USERNAME` 和 `DOCKER_PASSWORD` 是否正确配置
- 确认 Docker Hub Access Token 有效
- 工作流中设置了 `continue-on-error: true`，不会阻止整体流程

### 3. Prisma 客户端生成失败

**原因**: `DATABASE_URL` 环境变量缺失

**解决**:

- 确保在生成 Prisma Client 步骤中设置了 `DATABASE_URL`
- 检查 Prisma schema 文件是否正确

### 4. 覆盖率上传失败

**原因**: Codecov 未配置或 token 过期

**解决**:

- 工作流中设置了 `continue-on-error: true`，不会影响 CI
- 如需要，在 [Codecov](https://codecov.io/) 注册并获取 token
- 添加 `CODECOV_TOKEN` 到 GitHub Secrets

---

## 📈 优化建议

### 1. 缓存优化

工作流已启用：

- ✅ pnpm 依赖缓存
- ✅ Docker 层缓存（GitHub Actions Cache）

### 2. 并行执行

当前工作流设计：

- `test` 任务独立执行
- `build` 和 `security` 依赖 `test` 完成
- `docker` 依赖 `test` 和 `build` 完成

### 3. 执行时间优化

- 使用 `pnpm install --frozen-lockfile` 加速安装
- Docker 构建使用多阶段构建
- 合理设置健康检查间隔

### 4. 可选：添加 E2E 测试

```yaml
- name: Run E2E tests
  run: pnpm test:e2e
  env:
    # ... 环境变量
```

---

## 📝 维护

### 更新 Node.js 版本

修改 `.github/workflows/ci-cd.yml` 中的环境变量：

```yaml
env:
  NODE_VERSION: '22' # 更新为新版本
```

### 更新依赖版本

定期更新 Actions：

```yaml
- uses: actions/checkout@v4 # 检查最新版本
- uses: actions/setup-node@v4 # 检查最新版本
- uses: pnpm/action-setup@v4 # 检查最新版本
```

---
