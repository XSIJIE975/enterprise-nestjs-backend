# 📚 项目文档导航

> 企业级 NestJS 后端系统完整文档

欢迎来到项目文档中心!本文档系统完整记录了系统架构、开发流程、编码规范和最佳实践。

---

## 文档目录结构

### 📘 快速开始指南 (guides/)

新手入门和日常开发指南

- [**环境搭建与快速开始**](./guides/getting-started.md)
  - 前置要求与软件安装
  - 自动/手动启动流程
  - 常用命令和故障排除

- [**开发工作流程**](./guides/development-workflow.md)
  - 日常开发流程
  - 模块开发完整步骤(8个步骤)
  - 数据库操作和调试技巧

- [**编码规范**](./guides/coding-standards.md)
  - 命名规范(文件、类、变量等)
  - 代码组织和导入顺序
  - Git 提交规范(Conventional Commits)

- [**静态文件服务使用**](./guides/static-files-usage.md)
  - 静态文件目录说明
  - 访问方式和添加新文件
  - 注意事项和最佳实践

- [**Favicon 配置指南**](./guides/favicon-setup.md)
  - 在线生成器使用方法
  - 本地制作 Favicon 步骤
  - 多平台适配建议

### 🏗️ 架构文档 (architecture/)

系统架构设计和核心原理

- [**系统架构概览**](./architecture/overview.md)
  - 整体架构图和分层职责
  - 技术栈选型说明
  - 设计原则和技术亮点

- [**请求生命周期详解**](./architecture/request-lifecycle.md)
  - 8个处理阶段详解
  - 中间件/守卫/拦截器执行顺序
  - RequestId 链路追踪原理

- [**数据库设计规范**](./architecture/database-design.md)
  - Prisma Schema 设计规范
  - 关系设计(一对一/一对多/多对多)
  - 索引和性能优化

### 📦 模块文档 (modules/)

核心功能模块使用指南

- [**日志系统使用指南**](./modules/logging.md)
  - 文件日志和数据库日志配置
  - 日志记录 API 和装饰器使用
  - 请求链路追踪(RequestId)
  - 日志查询、统计和管理

- [**缓存系统使用指南**](./modules/cache.md)
  - Redis 和内存缓存实现
  - RBAC 角色权限缓存
  - 批量失效和反向索引
  - 配置和最佳实践

- [**认证授权模块**](./modules/authentication.md)
  - JWT 双 Token 认证机制
  - 登录/注册/刷新/登出流程
  - Token 黑名单和会话管理
  - 密码加密和安全策略

- **用户管理模块** (规划中)
  - 用户 CRUD 操作
  - 用户信息管理
  - 密码修改和重置

- **缓存系统模块** (规划中)
  - Redis 缓存使用
  - 内存缓存降级策略
  - 缓存失效和更新

- **RBAC 权限模块** (规划中)
  - 用户-角色-权限模型
  - 权限装饰器使用
  - 动态权限管理

### 🔌 API 文档 (api/)

API 设计规范和使用指南

- **REST API 设计规范** (规划中)
  - RESTful 设计原则
  - 统一响应格式
  - 错误码体系

- **API 版本管理** (规划中)
  - 版本控制策略
  - 向后兼容性
  - 迁移指南

---

## 🎯 推荐阅读路径

### 新手入门

第一次接触本项目?按以下顺序阅读:

1. ✅ [环境搭建](./guides/getting-started.md) - 10分钟搭建开发环境
2. ✅ [系统架构概览](./architecture/overview.md) - 15分钟了解整体架构
3. ✅ [请求生命周期](./architecture/request-lifecycle.md) - 20分钟理解请求处理

### 开始开发

准备开发新功能?阅读这些:

1. ✅ [开发工作流程](./guides/development-workflow.md) - 学习模块开发8步法
2. ✅ [编码规范](./guides/coding-standards.md) - 遵循项目代码风格
3. ✅ [日志系统](./modules/logging.md) - 掌握日志记录和链路追踪
4. ✅ [认证授权](./modules/authentication.md) - 理解 JWT 认证流程

### 深入学习

成为项目专家:

1. ✅ [数据库设计规范](./architecture/database-design.md) - Prisma 最佳实践
2. ✅ [认证授权机制](./modules/authentication.md) - JWT 双 Token 实现
3. 🔄 RBAC 权限系统(规划中)
4. 🔄 性能优化技巧(规划中)

---

## 快速查找

### 遇到问题?

- **环境搭建失败**: [故障排除](./guides/getting-started.md#故障排除)
- **如何创建新模块**: [模块开发流程](./guides/development-workflow.md#模块开发流程)
- **日志没有 requestId**: [请求链路追踪](./modules/logging.md#请求链路跟踪-request-id)
- **数据库设计疑问**: [数据库设计规范](./architecture/database-design.md)
- **JWT 认证失败**: [认证授权 - 故障排查](./modules/authentication.md#故障排查)
- **Token 刷新问题**: [认证授权 - Token 刷新](./modules/authentication.md#token-刷新)

### 常用参考

- **命名规范**: [编码规范 - 命名规范](./guides/coding-standards.md#命名规范)
- **Git 提交格式**: [编码规范 - Git 提交规范](./guides/coding-standards.md#git-提交规范)
- **Prisma 关系设计**: [数据库设计 - 关系设计](./architecture/database-design.md#关系设计)
- **日志 API**: [日志系统 - 日志记录 API](./modules/logging.md#日志记录-api)
- **认证守卫使用**: [认证授权 - 守卫使用](./modules/authentication.md#守卫使用)
- **配置管理规范**: [开发工作流程 - 配置管理](./guides/development-workflow.md)

---

## 📝 文档维护说明

### 贡献指南

欢迎为文档做出贡献!如果你发现:

- 📌 错误或过时的信息
- 💡 可以改进的内容
- 📚 缺失的重要主题

请通过以下方式反馈:

1. 提交 GitHub Issue
2. 创建 Pull Request
3. 联系项目维护者

### 文档规范

所有文档遵循:

- ✅ Markdown 格式
- ✅ 中文撰写
- ✅ 代码示例完整可运行
- ✅ 包含"下一步"导航链接

---

**最后更新**: 2025-10-20
**维护者**: XSIJIE

感谢阅读!祝开发愉快! 🎉
