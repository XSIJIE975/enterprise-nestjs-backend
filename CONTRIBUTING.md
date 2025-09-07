# 🤝 贡献指南

感谢您对 NestJS Enterprise API 项目的关注和贡献！

## 🌟 如何贡献

### 1. 报告问题

- 使用 [GitHub Issues](https://github.com/your-username/nest-enterprise-api/issues) 报告 bug
- 提供详细的问题描述和复现步骤
- 包含相关的错误信息和环境信息

### 2. 功能建议

- 在提交新功能之前，请先创建 Issue 讨论
- 详细描述功能的用途和实现方案
- 考虑功能的通用性和维护成本

### 3. 代码贡献

#### 开发流程

1. **Fork 仓库**
   ```bash
   git clone https://github.com/your-username/nest-enterprise-api.git
   cd nest-enterprise-api
   ```

2. **创建特性分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **安装依赖**
   ```bash
   pnpm install
   ```

4. **开发和测试**
   ```bash
   # 启动开发服务器
   pnpm start:dev
   
   # 运行测试
   pnpm test
   
   # 代码检查
   pnpm lint
   ```

5. **提交代码**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   git push origin feature/amazing-feature
   ```

6. **创建 Pull Request**

#### 代码规范

- 遵循 ESLint 和 Prettier 配置
- 使用 TypeScript 严格模式
- 遵循 NestJS 最佳实践
- 保持 80% 以上的测试覆盖率

#### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

类型（type）包括：
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档变更
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建或辅助工具变更

示例：
```
feat(auth): add two-factor authentication
fix(user): resolve password reset email issue
docs: update API documentation
```

## 🔍 代码审查

所有的代码变更都需要经过 Code Review：

- 确保代码符合项目规范
- 验证功能正确性
- 检查安全性和性能
- 确保有适当的测试覆盖

## 📋 开发环境

### 系统要求

- Node.js >= 22.x
- pnpm >= 9.x
- MySQL >= 8.0
- Redis >= 7.0

### 推荐工具

- **IDE**: Visual Studio Code
- **数据库工具**: Prisma Studio, MySQL Workbench
- **API测试**: Postman, Insomnia
- **Git工具**: GitKraken, SourceTree

### VS Code 扩展

推荐安装以下扩展：

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "prisma.prisma",
    "humao.rest-client"
  ]
}
```

## 📚 文档贡献

文档同样重要，您可以：

- 修正错别字和语法错误
- 改进现有文档的清晰度
- 添加新的使用示例
- 翻译文档到其他语言

## 🎯 优先级任务

当前需要帮助的领域：

- [ ] 添加更多测试用例
- [ ] 完善 API 文档
- [ ] 性能优化
- [ ] 国际化支持
- [ ] Docker 优化

## 💬 社区

- **讨论**: [GitHub Discussions](https://github.com/your-username/nest-enterprise-api/discussions)
- **问题**: [GitHub Issues](https://github.com/your-username/nest-enterprise-api/issues)

## 📄 许可证

通过贡献代码，您同意您的贡献将在 [MIT License](./LICENSE) 下授权。

---

再次感谢您的贡献！🎉
