# PM2 部署指南

> 📌 **维护者**: XSIJIE | **最后更新**: 2025-11-07

> 完整的 PM2 进程管理与部署文档 | 零停机部署 | 集群模式 | 自动重启 | 日志管理

## 目录

- [1. PM2 简介](#1-pm2-简介)
- [2. 环境准备](#2-环境准备)
- [3. PM2 安装与配置](#3-pm2-安装与配置)
- [4. 部署流程](#4-部署流程)
- [5. 常用命令](#5-常用命令)
- [6. 监控与日志](#6-监控与日志)
- [7. 自动化部署](#7-自动化部署)
- [8. 故障排查](#8-故障排查)
- [9. 性能优化](#9-性能优化)
- [10. 最佳实践](#10-最佳实践)
- [11. PM2 vs Docker](#11-pm2-vs-docker)

---

## 1. PM2 简介

### 什么是 PM2？

**PM2** (Process Manager 2) 是一个功能强大的 Node.js 进程管理器，提供以下核心功能：

- ✅ **进程守护**: 应用崩溃自动重启
- ✅ **集群模式**: 充分利用多核 CPU
- ✅ **零停机部署**: 平滑更新不中断服务
- ✅ **日志管理**: 自动日志分割和归档
- ✅ **性能监控**: 实时监控 CPU/内存使用
- ✅ **开机自启**: systemd/launchd 集成
- ✅ **负载均衡**: 内置负载均衡器

### 为什么选择 PM2？

| 特性       | PM2                     | Docker               | systemd      |
| ---------- | ----------------------- | -------------------- | ------------ |
| 学习成本   | ⭐ 低                   | ⭐⭐ 中              | ⭐⭐⭐ 高    |
| 资源占用   | ⭐ 最低                 | ⭐⭐ 中等            | ⭐ 最低      |
| 启动速度   | ⭐⭐⭐ 秒级             | ⭐⭐ 秒级 (容器启动) | ⭐⭐⭐ 秒级  |
| 零停机部署 | ⭐⭐⭐ 原生支持         | ⭐⭐ 需编排工具      | ⭐ 不支持    |
| 集群模式   | ⭐⭐⭐ 原生支持         | ⭐⭐ 需配置          | ⭐ 不支持    |
| 日志管理   | ⭐⭐⭐ 强大             | ⭐⭐ 需配置          | ⭐⭐ 基础    |
| 监控面板   | ⭐⭐⭐ 内置 (pm2 monit) | ⭐⭐ 需第三方        | ⭐ 无        |
| 适用场景   | 单机/小规模部署         | 微服务/容器化        | 简单后台服务 |

**推荐场景：**

- ✅ 单机或小规模服务器部署
- ✅ 需要快速部署和迭代的项目
- ✅ 团队对 Docker 不熟悉
- ✅ 需要零停机更新
- ✅ 需要实时监控和日志

---

## 2. 环境准备

### 2.1 系统要求

- **操作系统**: Linux / macOS / Windows
- **Node.js**: >= 22.0.0 LTS
- **pnpm**: >= 9.0.0
- **PM2**: >= 5.0.0

### 2.2 安装依赖

#### Linux / macOS

```bash
# 1. 安装 Node.js (使用 nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22

# 2. 安装 pnpm
npm install -g pnpm@9

# 3. 安装 PM2
npm install -g pm2

# 4. 验证安装
node -v    # v22.x.x
pnpm -v    # 9.x.x
pm2 -v     # 5.x.x
```

#### Windows

```powershell
# 1. 从官网下载安装 Node.js 22.x
# https://nodejs.org/

# 2. 安装 pnpm
npm install -g pnpm@9

# 3. 安装 PM2
npm install -g pm2
npm install -g pm2-windows-startup

# 4. 配置开机自启 (可选)
pm2-startup install

# 5. 验证安装
node -v
pnpm -v
pm2 -v
```

### 2.3 服务器配置检查

```bash
# 检查 CPU 核心数 (决定集群实例数)
nproc  # Linux
sysctl -n hw.ncpu  # macOS

# 检查可用内存
free -h  # Linux
vm_stat  # macOS

# 检查端口占用
netstat -tuln | grep 8002  # 生产端口
netstat -tuln | grep 8001  # 测试端口
```

---

## 3. PM2 安装与配置

### 3.1 项目配置文件

本项目已包含完整的 PM2 配置文件 `ecosystem.config.js`，位于项目根目录。

**配置文件结构：**

```javascript
module.exports = {
  apps: [
    {
      name: 'nest-api-dev', // 开发环境
      script: './dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      env_file: '.env.development',
      // ... 其他配置
    },
    {
      name: 'nest-api-test', // 测试环境
      instances: 2,
      exec_mode: 'cluster',
      env_file: '.env.test',
      // ... 其他配置
    },
    {
      name: 'nest-api-prod', // 生产环境
      instances: 'max', // CPU 核心数
      exec_mode: 'cluster',
      env_file: '.env.production',
      max_memory_restart: '1G',
      cron_restart: '0 4 * * *', // 每天凌晨 4 点重启
      // ... 其他配置
    },
  ],
};
```

### 3.2 环境变量配置

确保对应环境的 `.env` 文件已正确配置：

```bash
# 检查配置文件
ls -la .env.*

# .env.development  - 开发环境
# .env.test         - 测试环境
# .env.production   - 生产环境
```

**重要配置项：**

```bash
# .env.production 示例
NODE_ENV=production
PORT=8002
HOST=0.0.0.0

# 数据库配置
DATABASE_URL=mysql://user:password@localhost:3306/db_name

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT 配置
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

---

## 4. 部署流程

### 4.1 手动部署步骤

#### 生产环境部署

```bash
# 1. 进入项目目录
cd /path/to/enterprise-nestjs-backend

# 2. 拉取最新代码 (如果使用 Git)
git pull origin main

# 3. 安装依赖
pnpm install --prod --frozen-lockfile

# 4. 构建项目
pnpm build

# 5. 执行数据库迁移
pnpm db:migrate:deploy

# 6. 首次启动应用
pm2 start ecosystem.config.js --env production --only nest-api-prod

# 或者：已存在应用时执行零停机重载
pm2 reload nest-api-prod

# 7. 保存 PM2 配置
pm2 save

# 8. 查看应用状态
pm2 status

# 9. 查看日志
pm2 logs nest-api-prod
```

#### 测试环境部署

```bash
# 启动测试环境
pm2 start ecosystem.config.js --env test --only nest-api-test

# 或重载
pm2 reload nest-api-test
```

#### 开发环境部署

```bash
# 启动开发环境
pm2 start ecosystem.config.js --env development --only nest-api-dev
```

### 4.2 使用 package.json 命令

项目已配置快捷命令，可直接使用：

```bash
# 生产环境
pnpm pm2:start:prod      # 启动
pnpm pm2:reload:prod     # 零停机重载
pnpm pm2:restart:prod    # 重启
pnpm pm2:stop:prod       # 停止
pnpm pm2:logs:prod       # 查看日志

# 测试环境
pnpm pm2:start:test
pnpm pm2:reload:test
pnpm pm2:logs:test

# 开发环境
pnpm pm2:start:dev
pnpm pm2:stop:dev
pnpm pm2:logs:dev

# 通用命令
pnpm pm2:status          # 查看所有应用状态
pnpm pm2:monit           # 监控面板
```

### 4.3 一键部署脚本

#### Linux / macOS

```bash
# 生产环境
bash scripts/pm2-deploy-prod.sh

# 测试环境
bash scripts/pm2-deploy-test.sh
```

#### Windows

```powershell
# 生产环境
.\scripts\pm2-deploy-prod.ps1

# 测试环境
.\scripts\pm2-deploy-test.ps1
```

**脚本功能：**

- ✅ 自动检查环境依赖
- ✅ 拉取最新代码
- ✅ 安装依赖并构建
- ✅ 执行数据库迁移
- ✅ 启动/重载 PM2 应用
- ✅ 健康检查
- ✅ 显示应用状态

---

## 5. 常用命令

### 5.1 应用管理

```bash
# 启动应用
pm2 start ecosystem.config.js --env production --only nest-api-prod

# 停止应用
pm2 stop nest-api-prod

# 重启应用 (有短暂停机)
pm2 restart nest-api-prod

# 重载应用 (零停机，推荐)
pm2 reload nest-api-prod

# 删除应用
pm2 delete nest-api-prod

# 停止所有应用
pm2 stop all

# 重启所有应用
pm2 restart all

# 删除所有应用
pm2 delete all
```

### 5.2 应用信息

```bash
# 查看所有应用状态
pm2 status
pm2 list
pm2 ls

# 查看特定应用详情
pm2 describe nest-api-prod
pm2 show nest-api-prod

# 查看应用环境变量
pm2 env 0  # 0 是应用 ID
```

### 5.3 日志管理

```bash
# 查看实时日志 (所有应用)
pm2 logs

# 查看特定应用日志
pm2 logs nest-api-prod

# 查看错误日志
pm2 logs nest-api-prod --err

# 查看标准输出日志
pm2 logs nest-api-prod --out

# 查看最近 N 行日志
pm2 logs nest-api-prod --lines 100

# 清空日志
pm2 flush

# 日志文件位置
tail -f logs/pm2/prod-error.log
tail -f logs/pm2/prod-out.log
```

### 5.4 监控面板

```bash
# 实时监控 (终端 UI)
pm2 monit

# 显示按键说明：
# - 方向键：切换应用
# - Ctrl+C：退出

# Web 监控面板 (PM2 Plus - 需注册)
pm2 plus
```

### 5.5 配置保存与恢复

```bash
# 保存当前运行的所有应用配置
pm2 save

# 恢复保存的应用配置
pm2 resurrect

# 清空保存的应用列表
pm2 cleardump
```

### 5.6 开机自启

```bash
# Linux (systemd)
pm2 startup systemd
# 复制输出的命令并执行

# macOS (launchd)
pm2 startup launchd

# Windows
pm2-startup install

# 保存当前应用列表为开机自启
pm2 save

# 禁用开机自启
pm2 unstartup
```

---

## 6. 监控与日志

### 6.1 日志目录结构

```
logs/
└── pm2/
    ├── dev-error.log       # 开发环境错误日志
    ├── dev-out.log         # 开发环境标准输出
    ├── test-error.log      # 测试环境错误日志
    ├── test-out.log        # 测试环境标准输出
    ├── prod-error.log      # 生产环境错误日志
    └── prod-out.log        # 生产环境标准输出
```

### 6.2 日志轮转配置

PM2 日志可能会持续增长，建议配置日志轮转：

```bash
# 安装 PM2 日志轮转模块
pm2 install pm2-logrotate

# 配置日志轮转
pm2 set pm2-logrotate:max_size 100M          # 单个日志文件最大 100MB
pm2 set pm2-logrotate:retain 30              # 保留最近 30 个日志文件
pm2 set pm2-logrotate:compress true          # 压缩旧日志
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD  # 日期格式
pm2 set pm2-logrotate:rotateModule true      # 轮转模块日志

# 查看配置
pm2 conf pm2-logrotate
```

### 6.3 监控指标

```bash
# 实时监控 CPU 和内存
pm2 monit

# 查看应用指标
pm2 describe nest-api-prod

# 关键指标：
# - CPU 使用率
# - 内存使用量
# - 重启次数
# - 运行时间
# - 集群实例数
```

### 6.4 PM2 Plus 云监控 (可选)

PM2 Plus 提供专业的云监控服务：

```bash
# 注册并连接 PM2 Plus
pm2 plus

# 功能：
# - 实时监控面板
# - 错误追踪
# - 性能分析
# - 告警通知
# - 日志搜索
```

**官网**: [https://pm2.io/](https://pm2.io/)

---

## 7. 自动化部署

### 7.1 CI/CD 集成

#### GitHub Actions 示例

```yaml
# .github/workflows/deploy-prod.yml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install pnpm
        run: npm install -g pnpm@9

      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/enterprise-nestjs-backend
            git pull origin main
            pnpm install --prod --frozen-lockfile
            pnpm build
            pnpm db:migrate:deploy
            pm2 reload nest-api-prod
            pm2 save
```

### 7.2 Git Hooks 集成

```bash
# 安装 husky
pnpm add -D husky

# 配置 pre-push 钩子
# .husky/pre-push
#!/bin/sh
pnpm lint
pnpm type-check
pnpm test
```

### 7.3 远程部署命令

```bash
# SSH 远程部署
ssh user@your-server.com << 'EOF'
  cd /var/www/enterprise-nestjs-backend
  bash scripts/pm2-deploy-prod.sh
EOF
```

---

## 8. 故障排查

### 8.1 常见问题

#### 问题 1: 应用无法启动

```bash
# 查看详细错误信息
pm2 logs nest-api-prod --err

# 可能原因：
# - 端口被占用
# - 环境变量配置错误
# - 数据库连接失败
# - 缺少依赖

# 解决方法：
# 1. 检查端口占用
netstat -tuln | grep 8002

# 2. 验证环境变量
cat .env.production

# 3. 测试数据库连接
pnpm db:migrate:status

# 4. 重新安装依赖
rm -rf node_modules
pnpm install
```

#### 问题 2: 应用频繁重启

```bash
# 查看重启历史
pm2 describe nest-api-prod

# 可能原因：
# - 内存溢出
# - 代码错误导致崩溃
# - 数据库连接中断

# 解决方法：
# 1. 增加内存限制
# ecosystem.config.js 中设置
max_memory_restart: '2G'

# 2. 查看错误日志
pm2 logs nest-api-prod --err --lines 100

# 3. 临时禁用自动重启 (调试用)
pm2 stop nest-api-prod
node dist/src/main.js  # 直接运行查看错误
```

#### 问题 3: 零停机重载失败

```bash
# 如果 reload 失败，使用 restart
pm2 restart nest-api-prod

# 检查集群模式是否启用
pm2 describe nest-api-prod | grep "exec mode"

# 注意：fork 模式不支持零停机重载
# 需要使用 cluster 模式
```

#### 问题 4: 日志文件过大

```bash
# 安装日志轮转模块
pm2 install pm2-logrotate

# 手动清理日志
pm2 flush

# 删除旧日志文件
rm logs/pm2/*.log
```

### 8.2 调试技巧

```bash
# 1. 查看应用完整信息
pm2 prettylist

# 2. 监听文件变化 (仅开发环境)
pm2 start ecosystem.config.js --env development --watch

# 3. 查看环境变量
pm2 env 0

# 4. 测试配置文件
pm2 start ecosystem.config.js --only nest-api-prod --no-daemon

# 5. 导出配置为 JSON
pm2 save
cat ~/.pm2/dump.pm2
```

---

## 9. 性能优化

### 9.1 集群实例数优化

```javascript
// ecosystem.config.js

// 方式 1: 自动设置为 CPU 核心数 (推荐生产环境)
instances: 'max';

// 方式 2: 设置为 CPU 核心数 - 1 (预留 1 核给系统)
instances: require('os').cpus().length - 1;

// 方式 3: 固定实例数
instances: 4;

// 建议：
// - 1-2 核 CPU: 1-2 实例
// - 4 核 CPU: 3-4 实例
// - 8 核 CPU: 6-8 实例
```

### 9.2 内存优化

```javascript
// ecosystem.config.js

// 内存限制 (根据服务器配置调整)
max_memory_restart: '1G',  // 超过 1GB 自动重启

// 推荐配置：
// - 1GB 内存服务器: 256M-512M
// - 2GB 内存服务器: 512M-1G
// - 4GB 内存服务器: 1G-2G
// - 8GB+ 内存服务器: 2G-4G
```

### 9.3 定时重启策略

```javascript
// ecosystem.config.js

// 每天凌晨 4 点重启 (释放内存)
cron_restart: '0 4 * * *',

// 其他示例：
// 每 6 小时重启一次
// cron_restart: '0 */6 * * *',

// 每周一凌晨 3 点重启
// cron_restart: '0 3 * * 1',
```

### 9.4 负载均衡

PM2 的 cluster 模式内置负载均衡，使用 Round-Robin 算法分配请求。

```bash
# 查看集群实例负载
pm2 describe nest-api-prod

# 实时监控各实例 CPU/内存
pm2 monit
```

---

## 10. 最佳实践

### 10.1 生产环境部署清单

- ✅ 使用 `cluster` 模式启动
- ✅ 设置合理的 `max_memory_restart`
- ✅ 配置日志轮转 (`pm2-logrotate`)
- ✅ 启用 `cron_restart` 定时重启
- ✅ 使用 `pm2 reload` 进行零停机部署
- ✅ 配置开机自启 (`pm2 startup`)
- ✅ 定期执行 `pm2 save` 保存配置
- ✅ 配置 Nginx 反向代理
- ✅ 启用 HTTPS (SSL 证书)
- ✅ 配置防火墙规则

### 10.2 安全建议

```bash
# 1. 不要以 root 用户运行应用
# 创建专用用户
sudo useradd -m -s /bin/bash nodejs
sudo -u nodejs pm2 start ecosystem.config.js

# 2. 限制 PM2 命令权限
# 仅允许特定用户操作 PM2

# 3. 敏感信息使用环境变量
# 不要在代码中硬编码密码

# 4. 定期更新 PM2 和依赖
npm update -g pm2
pnpm update
```

### 10.3 监控与告警

```bash
# 1. 配置 PM2 Plus 告警 (推荐)
pm2 plus

# 2. 监控脚本 (自定义)
# scripts/pm2-monitor.sh
#!/bin/bash
# 检查应用是否在线
if ! pm2 describe nest-api-prod | grep "online"; then
    echo "Application is down!" | mail -s "PM2 Alert" admin@example.com
fi

# 3. 集成 Prometheus + Grafana
# 安装 pm2-prometheus-exporter
pm2 install pm2-prometheus-exporter
```

### 10.4 备份与恢复

```bash
# 1. 备份 PM2 配置
pm2 save
cp ~/.pm2/dump.pm2 ~/backup/dump.pm2.$(date +%Y%m%d)

# 2. 恢复 PM2 配置
pm2 resurrect

# 3. 备份环境变量
cp .env.production ~/backup/.env.production.$(date +%Y%m%d)

# 4. 备份数据库
mysqldump -u root -p enterprise_db > ~/backup/db_$(date +%Y%m%d).sql
```

---

## 11. PM2 vs Docker

### 11.1 对比分析

| 特性           | PM2                      | Docker                   |
| -------------- | ------------------------ | ------------------------ |
| **学习曲线**   | ⭐ 简单                  | ⭐⭐ 中等                |
| **部署速度**   | ⭐⭐⭐ 快 (秒级)         | ⭐⭐ 中等 (容器启动)     |
| **资源占用**   | ⭐⭐⭐ 低                | ⭐⭐ 中等 (容器开销)     |
| **隔离性**     | ⭐⭐ 进程级              | ⭐⭐⭐ 容器级 (更强)     |
| **零停机部署** | ⭐⭐⭐ 原生支持 (reload) | ⭐⭐ 需编排工具          |
| **集群模式**   | ⭐⭐⭐ 原生支持          | ⭐⭐ 需配置              |
| **日志管理**   | ⭐⭐⭐ 强大              | ⭐⭐ 需第三方工具        |
| **监控面板**   | ⭐⭐⭐ 内置 (pm2 monit)  | ⭐⭐ 需第三方            |
| **跨平台**     | ⭐⭐⭐ 完美支持          | ⭐⭐⭐ 完美支持          |
| **微服务**     | ⭐⭐ 一般                | ⭐⭐⭐ 优秀              |
| **K8s 集成**   | ⭐ 不支持                | ⭐⭐⭐ 原生支持          |
| **版本管理**   | ⭐⭐ 代码版本            | ⭐⭐⭐ 镜像版本 (不可变) |
| **环境一致性** | ⭐⭐ 依赖系统环境        | ⭐⭐⭐ 容器内环境独立    |

### 11.2 使用建议

#### 选择 PM2 的场景：

- ✅ 单机或小规模服务器部署 (1-5 台)
- ✅ 团队对 Docker 不熟悉，学习成本有限
- ✅ 需要快速迭代和部署
- ✅ 服务器资源有限 (1-2GB 内存)
- ✅ 需要零停机部署和实时监控
- ✅ 传统 VPS/云主机部署

#### 选择 Docker 的场景：

- ✅ 微服务架构 (多个服务)
- ✅ 需要严格的环境隔离
- ✅ 需要 K8s 编排
- ✅ 团队熟悉容器化技术
- ✅ 需要不可变基础设施
- ✅ 需要快速水平扩展

#### 混合使用方案：

```bash
# 使用 PM2 管理 Docker 容器
pm2 start docker-compose.yml --name app-containers

# 或者在 Docker 容器内使用 PM2
# Dockerfile
FROM node:22-alpine
RUN npm install -g pm2
COPY . /app
WORKDIR /app
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
```

---

## 附录

### A. 参考资源

- **PM2 官方文档**: [https://pm2.keymetrics.io/](https://pm2.keymetrics.io/)
- **PM2 GitHub**: [https://github.com/Unitech/pm2](https://github.com/Unitech/pm2)
- **PM2 Plus 监控**: [https://pm2.io/](https://pm2.io/)
- **NestJS 官方文档**: [https://nestjs.com/](https://nestjs.com/)

### B. 相关文档

- [环境搭建指南](getting-started.md)
- [Docker 部署指南](docker-guide.md)
- [开发工作流](development-workflow.md)
- [编码规范](coding-standards.md)

### C. 常用脚本

```bash
# 快速重启所有生产应用
alias pm2-reload-prod='pm2 reload nest-api-prod && pm2 save'

# 查看生产日志
alias pm2-logs-prod='pm2 logs nest-api-prod'

# 查看生产状态
alias pm2-status-prod='pm2 describe nest-api-prod'

# 备份 PM2 配置
alias pm2-backup='pm2 save && cp ~/.pm2/dump.pm2 ~/backup/dump.pm2.$(date +%Y%m%d)'
```

---
