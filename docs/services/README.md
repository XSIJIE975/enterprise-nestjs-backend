# 🔧 服务文档

> 通用工具服务 API 使用指南

## 📖 概述

本目录包含项目中通用工具服务的详细使用文档。这些服务位于 `src/common/services/` 目录下，通过 `CommonModule` 全局导出，可以在任何模块中通过依赖注入使用。

## 📋 服务列表

### [UploadConfigService](./upload-config-service.md)

**功能**：统一管理文件上传配置，提供预设场景和灵活自定义

**使用场景**：

- 图片上传（产品图、用户头像、文章配图等）
- 文档上传（PDF、Word、Excel 等）
- 视频/音频上传
- 数据导入（CSV、Excel）

**特点**：

- ✅ 6 种预设场景配置
- ✅ 支持部分覆盖和完全自定义
- ✅ 配置驱动，多环境适配
- ✅ 类型安全

**快速示例**：

```typescript
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadConfigService: UploadConfigService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', this.uploadConfigService.getConfig('image')),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return { filename: file.filename };
  }
}
```

---

## 🔍 如何使用服务

### 1. 导入 CommonModule

在需要使用的模块中导入 `CommonModule`：

```typescript
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [YourController],
  providers: [YourService],
})
export class YourModule {}
```

### 2. 依赖注入

在控制器或服务中注入所需的服务：

```typescript
import { UploadConfigService } from '@/common/services/upload-config.service';

@Controller()
export class YourController {
  constructor(private readonly uploadConfigService: UploadConfigService) {}

  // 使用服务
}
```

### 3. 调用服务方法

根据服务文档调用相应的方法。

## 🎯 服务设计原则

本项目的通用服务遵循以下设计原则：

1. **单一职责**：每个服务专注于一个特定领域
2. **配置驱动**：通过 `ConfigService` 读取配置，支持多环境
3. **依赖注入**：使用 NestJS 依赖注入，便于测试和维护
4. **类型安全**：充分利用 TypeScript 类型系统
5. **文档完善**：提供详细的使用文档和示例代码

---

## 📚 相关文档

- [Common Services 实现代码](../../src/common/services/)
- [模块文档](../modules/)
- [开发指南](../guides/)
- [项目文档导航](../README.md)

---

**维护者**: XSIJIE  
**最后更新**: 2025-10-23
