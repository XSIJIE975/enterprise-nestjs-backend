# 项目示例代码

本目录包含项目中各个模块的使用示例代码，帮助开发者快速理解和使用项目功能。

## 目录结构

```text
src/examples/
├── logging/                              # 日志模块示例
│   ├── basic-logging.example.ts          # 基础日志使用
│   └── database-logging.example.ts       # 数据库日志装饰器
└── README.md                             # 本文件
```

## 日志模块示例

### 基础日志使用

**文件**: `logging/basic-logging.example.ts`

展示最常用的日志记录方法：

- ✅ 基本日志级别（log、debug、warn、error）
- ✅ 获取请求上下文（requestId、userId、IP）
- ✅ 业务事件日志
- ✅ 错误处理日志
- ✅ 审计日志

### 数据库日志装饰器

**文件**: `logging/database-logging.example.ts`

演示如何使用装饰器控制数据库日志：

- ✅ `@EnableDatabaseLog()` - 启用数据库日志
- ✅ `@DisableDatabaseLog()` - 禁用数据库日志
- ✅ 装饰器优先级规则
- ✅ 生产环境使用建议

## 使用示例代码

这些示例代码仅供参考，**不会在实际项目中运行**。

如果需要测试示例代码：

1. 复制示例代码到实际的 Service 或 Controller 中
2. 根据实际业务需求调整代码
3. 确保已正确注入依赖

## 完整文档

详细的使用文档请参考：

- [日志系统文档](../../docs/modules/logging.md)
- [开发工作流](../../docs/guides/development-workflow.md)
- [编码规范](../../docs/guides/coding-standards.md)

## 贡献示例

如果你有好的示例代码想要分享：

1. 在对应模块文件夹下创建示例文件
2. 遵循命名规范：`功能名称.example.ts`
3. 添加清晰的注释和使用说明
4. 保持代码简洁，只展示核心用法
5. 更新本 README 文档

## 注意事项

⚠️ **重要提示**：

- 示例代码仅用于学习和参考
- 不要在示例代码中包含敏感信息
- 保持示例代码简洁，避免过度复杂
- 定期检查示例代码是否与最新 API 保持一致
