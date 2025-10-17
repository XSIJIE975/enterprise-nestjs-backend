# 脚本使用说明

本目录包含用于项目管理和部署的各种脚本文件。

## 📜 脚本列表

### PowerShell 脚本（推荐 Windows 用户使用）

#### 1. `start.ps1` - 开发环境启动脚本

**用途**: 一键启动开发环境，包含完整的环境检查、依赖安装、数据库初始化等功能。

**使用方法**:

```powershell
# 方法 1: 直接运行
.\scripts\start.ps1

# 方法 2: 从项目根目录运行
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

**功能特性**:

- ✅ 自动检查 Node.js、pnpm、Docker 环境
- ✅ 验证 Node.js 版本（需要 22.0.0+）
- ✅ 自动安装项目依赖
- ✅ 生成 Prisma 客户端
- ✅ 启动 Docker 数据库服务（MySQL + Redis）
- ✅ 执行数据库迁移
- ✅ 填充种子数据
- ✅ 启动开发服务器
- ✅ 彩色输出和进度提示
- ✅ 完善的错误处理和回滚机制

**首次运行**:
首次运行时，脚本会自动创建 `.env.development` 配置文件，请根据提示编辑后重新运行。

---

#### 2. `deploy-test.ps1` - 测试环境部署脚本

**用途**: 自动化测试环境部署，完全容器化，适合集成测试和 CI/CD。

**使用方法**:

```powershell
# 方法 1: 直接运行
.\scripts\deploy-test.ps1

# 方法 2: 从项目根目录运行
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-test.ps1
```

**功能特性**:

- ✅ 检查 Docker 和 Docker Compose 环境
- ✅ 支持 Docker Compose V1 和 V2
- ✅ 检查并创建测试环境配置文件
- ✅ 构建测试环境 Docker 镜像（NODE_ENV=test）
- ✅ 启动所有测试服务容器（App + MySQL + Redis）
- ✅ 独立端口避免与开发环境冲突（8001, 3307, 6380）
- ✅ 自动等待服务就绪（健康检查）
- ✅ 执行数据库迁移
- ✅ 显示服务状态和访问信息
- ✅ 失败时自动回滚服务

**环境特点**:

- 🔹 完全容器化部署
- 🔹 可与开发环境同时运行
- 🔹 独立的数据库和 Redis 实例
- 🔹 适合自动化测试

---

#### 3. `deploy-prod.ps1` - 生产环境部署脚本

**用途**: 自动化生产环境部署，包含镜像构建、服务启动、数据库迁移等功能。

**使用方法**:

```powershell
# 方法 1: 直接运行
.\scripts\deploy-prod.ps1

# 方法 2: 从项目根目录运行
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-prod.ps1
```

**功能特性**:

- ⚠️ 部署前需输入 'yes' 确认（防止误操作）
- ✅ 检查 Docker 和 Docker Compose 环境
- ✅ 支持 Docker Compose V1 和 V2
- ✅ 检查并创建生产环境配置文件
- ✅ 构建生产环境 Docker 镜像（NODE_ENV=production）
- ✅ 启动所有生产服务容器（App + MySQL + Redis）
- ✅ 自动等待服务就绪（健康检查）
- ✅ 执行数据库迁移（使用 migrate deploy）
- ✅ 显示服务状态和访问信息
- ✅ 失败时自动回滚服务

**安全提示**:

- 🔒 仅在确认环境正确时使用
- 🔒 部署前务必备份数据库
- 🔒 建议先在测试环境验证
- 🔒 检查 `.env.production` 配置
- 🔒 确认所有敏感信息已正确配置

---

### Bash 脚本（Linux/macOS 用户使用）

#### 4. `start.sh` - Linux/macOS 启动脚本

**用途**: Linux 和 macOS 系统的开发环境启动脚本。

**使用方法**:

```bash
# 添加执行权限（首次）
chmod +x scripts/start.sh

# 运行脚本
./scripts/start.sh
```

---

#### 5. `deploy-test.sh` - Linux/macOS 测试环境部署脚本

**用途**: Linux 和 macOS 系统的测试环境部署脚本。

**使用方法**:

```bash
# 添加执行权限（首次）
chmod +x scripts/deploy-test.sh

# 运行脚本
./scripts/deploy-test.sh
```

---

#### 6. `deploy-prod.sh` - Linux/macOS 生产环境部署脚本

**用途**: Linux 和 macOS 系统的生产环境部署脚本。

**使用方法**:

```bash
# 添加执行权限（首次）
chmod +x scripts/deploy-prod.sh

# 运行脚本
./scripts/deploy-prod.sh
```

---

## 🚀 快速开始

### Windows 用户

1. **开发环境**:

   ```powershell
   .\scripts\start.ps1
   ```

2. **测试环境**:

   ```powershell
   .\scripts\deploy-test.ps1
   ```

3. **生产部署**:

   ```powershell
   .\scripts\deploy-prod.ps1
   ```

### Linux/macOS 用户

1. **开发环境**:

   ```bash
   ./scripts/start.sh
   ```

2. **测试环境**:

   ```bash
   ./scripts/deploy-test.sh
   ```

3. **生产部署**:

   ```bash
   ./scripts/deploy-prod.sh
   ```

---

## 🌍 环境说明

本项目支持三种独立的部署环境：

| 环境     | 端口 | 脚本                                 | 用途                 |
| -------- | ---- | ------------------------------------ | -------------------- |
| **开发** | 8000 | `start.ps1` / `start.sh`             | 本地开发，应用热重载 |
| **测试** | 8001 | `deploy-test.ps1` / `deploy-test.sh` | 集成测试，完全容器化 |
| **生产** | 8002 | `deploy-prod.ps1` / `deploy-prod.sh` | 生产部署，优化配置   |

**环境特点**:

- ✅ 三个环境完全独立，互不冲突
- ✅ 可同时运行开发和测试环境
- ✅ 统一的命名规范（enterprise-{service}-{env}）
- ✅ 独立的网络和数据卷
- ✅ 环境特定的配置文件（.env.{environment}）

---

## ⚙️ 执行策略问题

如果在 Windows 上遇到执行策略限制，可以使用以下方法之一：

### 方法 1: 临时绕过执行策略（推荐）

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

### 方法 2: 为当前用户设置执行策略

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 方法 3: 仅为当前会话设置

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\scripts\start.ps1
```

---

## 📋 前置要求

所有脚本都需要以下环境：

### 必需

- ✅ Node.js 22.0.0 或更高版本
- ✅ pnpm 9.0.0 或更高版本
- ✅ Docker（用于快速部署相关环境，如有相关环境可跳过）

### 可选

- VS Code（推荐用于编辑配置文件）
- Docker Desktop（Windows 用户）

---

## 🔍 故障排除

### 问题 1: "无法加载文件，因为在此系统上禁止运行脚本"

**原因**: Windows PowerShell 执行策略限制。

**解决方案**:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

### 问题 2: "Docker 未运行"

**原因**: Docker Desktop 未启动。

**解决方案**: 启动 Docker Desktop 后重新运行脚本。

### 问题 3: "Node.js 版本过低"

**原因**: 项目需要 Node.js 22.0.0+。

**解决方案**:

- 下载最新版本: <https://nodejs.org/>
- 或使用 nvm: `nvm install 22 && nvm use 22`

### 问题 4: "未安装 pnpm"

**解决方案**:

```powershell
npm install -g pnpm
```

### 问题 5: 数据库迁移失败

**可能原因**:

- 数据库服务未完全启动
- 数据库连接配置错误
- 迁移文件有问题

**解决方案**:

1. 等待更长时间让数据库完全启动
2. 检查 `.env.development` 中的数据库配置
3. 查看数据库日志: `pnpm docker:dev:logs`

---

## 📝 脚本维护

### 修改脚本

所有脚本都包含详细的注释，修改时请：

1. 保持注释的完整性和准确性
2. 遵循现有的代码风格
3. 测试修改后的功能
4. 更新本 README 文档

### 添加新脚本

如需添加新脚本：

1. 为 Windows 创建 `.ps1` PowerShell 脚本
2. 为 Linux/macOS 创建 `.sh` Bash 脚本
3. 在本文档中添加使用说明
4. 确保包含充分的注释和错误处理

---

## 📚 相关文档

- [Docker 部署完整指南](../docs/guides/docker-guide.md) - Docker 部署详细文档
- [开发工作流程](../docs/guides/development-workflow.md)
- [入门指南](../docs/guides/getting-started.md)
- [项目 README](../README.md)

---

## 💡 使用建议

### 开发阶段

1. **日常开发**: 使用 `start.ps1` 快速启动开发环境
   - 应用运行在本地，支持热重载
   - 仅 Docker 运行数据库和 Redis

2. **集成测试**: 使用 `deploy-test.ps1` 启动测试环境
   - 完全容器化，与开发环境隔离
   - 独立端口，可同时运行

### 部署阶段

1. **测试验证**:

   ```powershell
   # 先在测试环境验证
   .\scripts\deploy-test.ps1

   # 运行测试
   pnpm test:e2e
   ```

2. **生产部署**:
   ```powershell
   # 确认无误后部署生产
   .\scripts\deploy-prod.ps1
   ```

### 常用操作

**查看日志**:

```powershell
# 开发环境
pnpm docker:dev:logs

# 测试环境
pnpm docker:test:logs

# 生产环境
pnpm docker:prod:logs
```

**停止服务**:

```powershell
# 开发环境（仅停止基础设施）
pnpm docker:dev:down

# 测试环境
pnpm docker:test:down

# 生产环境
pnpm docker:prod:down
```

**重启服务**:

```powershell
# 测试环境
docker compose -f docker-compose.test.yml restart

# 生产环境
docker compose -f docker-compose.prod.yml restart
```

---

**最后更新**: 2025-10-17
**维护者**: XSIJIE
