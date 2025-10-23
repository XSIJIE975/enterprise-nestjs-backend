# UploadConfigService 使用指南

> 统一的文件上传配置服务，支持预设场景和灵活自定义

## 📖 概述

`UploadConfigService` 是一个全局可用的配置服务，用于简化文件上传的配置管理。它提供：

- ✅ **预设场景配置**：开箱即用的图片、文档、视频、音频、头像配置
- ✅ **灵活覆盖**：在预设基础上自定义部分配置项
- ✅ **完全自定义**：支持从零构建完全自定义的配置
- ✅ **依赖注入**：通过 NestJS 依赖注入，在任何控制器中使用
- ✅ **类型安全**：完整的 TypeScript 类型支持

## 🎯 设计理念

### 配置层级

```
环境变量 (.env.*)
    ↓
upload.config.ts (配置文件)
    ↓
UploadConfigService (配置服务)
    ↓
预设场景 / 自定义配置
    ↓
控制器使用
```

### 三种使用方式

| 方式           | 方法                        | 适用场景              | 灵活度     |
| -------------- | --------------------------- | --------------------- | ---------- |
| **预设场景**   | `getConfig('image')`        | 标准上传需求（80%）   | ⭐⭐       |
| **预设+覆盖**  | `getConfig('image', {...})` | 需要微调的场景（15%） | ⭐⭐⭐⭐   |
| **完全自定义** | `getCustomConfig({...})`    | 特殊文件类型（5%）    | ⭐⭐⭐⭐⭐ |

## 📦 安装和配置

### 1. 服务已集成

`UploadConfigService` 已在 `CommonModule` 中注册，无需额外配置：

```typescript
// src/common/common.module.ts
@Module({
  providers: [UploadConfigService],
  exports: [UploadConfigService],
})
export class CommonModule {}
```

### 2. 环境变量配置

所有配置项均可通过环境变量自定义，详见 `.env.example`：

```bash
# 基础配置
UPLOAD_DEST=./uploads
UPLOAD_PRESERVE_ORIGINAL_NAME=false

# 图片配置
UPLOAD_IMAGE_MAX_SIZE=5242880          # 5MB
UPLOAD_IMAGE_ALLOWED_TYPES=image/jpeg,image/png,image/webp
UPLOAD_IMAGE_SUB_DIR=images

# 文档配置
UPLOAD_DOCUMENT_MAX_SIZE=10485760      # 10MB
UPLOAD_DOCUMENT_ALLOWED_TYPES=application/pdf,application/msword
UPLOAD_DOCUMENT_SUB_DIR=documents

# ... 其他配置
```

## 🚀 快速开始

### 基础用法：预设场景

最简单的方式，直接使用预设配置：

```typescript
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadConfigService } from '@/common/services/upload-config.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadConfigService: UploadConfigService) {}

  // ✅ 上传图片
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', this.uploadConfigService.getConfig('image')),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return {
      filename: file.filename,
      path: file.path,
      size: file.size,
    };
  }

  // ✅ 上传文档
  @Post('document')
  @UseInterceptors(
    FileInterceptor('file', this.uploadConfigService.getConfig('document')),
  )
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    return {
      filename: file.filename,
      path: file.path,
    };
  }

  // ✅ 上传头像
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', this.uploadConfigService.getConfig('avatar')),
  )
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    return {
      filename: file.filename,
      url: `/uploads/avatars/${file.filename}`,
    };
  }
}
```

### 进阶用法：预设 + 覆盖

在预设基础上自定义部分配置：

```typescript
@Controller('products')
export class ProductsController {
  constructor(private readonly uploadConfigService: UploadConfigService) {}

  // 产品图片：基于图片预设，但限制为 3MB
  @Post('image')
  @UseInterceptors(
    FileInterceptor(
      'file',
      this.uploadConfigService.getConfig('image', {
        maxFileSize: 3 * 1024 * 1024, // 覆盖为 3MB
        subDir: 'products', // 自定义子目录
      }),
    ),
  )
  uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    return { url: `/uploads/products/${file.filename}` };
  }

  // 产品手册：只允许 PDF
  @Post('manual')
  @UseInterceptors(
    FileInterceptor(
      'file',
      this.uploadConfigService.getConfig('document', {
        allowedMimeTypes: ['application/pdf'], // 只允许 PDF
        subDir: 'manuals',
        maxFileSize: 20 * 1024 * 1024, // 20MB
      }),
    ),
  )
  uploadManual(@UploadedFile() file: Express.Multer.File) {
    return { filename: file.filename };
  }
}
```

### 高级用法：完全自定义

适用于特殊文件类型或特殊需求：

```typescript
@Controller('imports')
export class ImportsController {
  constructor(private readonly uploadConfigService: UploadConfigService) {}

  // CSV 导入：完全自定义配置
  @Post('csv')
  @UseInterceptors(
    FileInterceptor(
      'file',
      this.uploadConfigService.getCustomConfig({
        maxFileSize: 10 * 1024 * 1024,
        allowedMimeTypes: ['text/csv', 'application/vnd.ms-excel'],
        subDir: 'imports/csv',
        preserveOriginalName: true, // 保留原始文件名
      }),
    ),
  )
  uploadCsv(@UploadedFile() file: Express.Multer.File) {
    // TODO: 解析 CSV 文件
    return { filename: file.filename };
  }

  // JSON 配置文件：完全自定义
  @Post('config')
  @UseInterceptors(
    FileInterceptor(
      'file',
      this.uploadConfigService.getCustomConfig({
        maxFileSize: 1 * 1024 * 1024,
        allowedMimeTypes: ['application/json'],
        subDir: 'configs',
      }),
    ),
  )
  uploadConfig(@UploadedFile() file: Express.Multer.File) {
    return { path: file.path };
  }
}
```

## 🎨 批量上传

使用 `FilesInterceptor` 支持批量上传：

```typescript
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('gallery')
export class GalleryController {
  constructor(private readonly uploadConfigService: UploadConfigService) {}

  // 批量上传图片（最多 10 张）
  @Post('images')
  @UseInterceptors(
    FilesInterceptor(
      'files',
      10, // 最多 10 个文件
      this.uploadConfigService.getConfig('image', {
        maxFileSize: 2 * 1024 * 1024, // 每张 2MB
        subDir: 'gallery',
      }),
    ),
  )
  uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    return {
      count: files.length,
      files: files.map(file => ({
        filename: file.filename,
        size: file.size,
      })),
    };
  }
}
```

## 📋 预设场景说明

### 1. `image` - 图片上传

**默认配置**（可通过环境变量修改）：

- 最大文件大小：`5MB`
- 允许类型：`image/jpeg`, `image/png`, `image/webp`, `image/gif`
- 存储目录：`uploads/images/`

**适用场景**：

- 产品图片
- 用户相册
- 文章配图
- 商品主图

### 2. `document` - 文档上传

**默认配置**：

- 最大文件大小：`10MB`
- 允许类型：PDF, Word, Excel, TXT
- 存储目录：`uploads/documents/`

**适用场景**：

- 合同文件
- 用户简历
- 报告文档
- 产品说明书

### 3. `video` - 视频上传

**默认配置**：

- 最大文件大小：`100MB`
- 允许类型：`video/mp4`, `video/mpeg`, `video/quicktime`
- 存储目录：`uploads/videos/`

**适用场景**：

- 宣传视频
- 教学视频
- 产品演示

### 4. `audio` - 音频上传

**默认配置**：

- 最大文件大小：`20MB`
- 允许类型：`audio/mpeg`, `audio/wav`, `audio/mp3`
- 存储目录：`uploads/audios/`

**适用场景**：

- 播客
- 语音消息
- 音乐文件

### 5. `avatar` - 头像上传

**默认配置**：

- 最大文件大小：`2MB`
- 允许类型：`image/jpeg`, `image/png`, `image/webp`
- 存储目录：`uploads/avatars/`
- 特殊：启用压缩和裁剪

**适用场景**：

- 用户头像
- 群组头像

### 6. `general` - 通用上传

**默认配置**：

- 最大文件大小：`10MB`
- 允许类型：图片 + PDF
- 存储目录：`uploads/`

**适用场景**：

- 默认上传类型
- 混合文件上传

## 🔧 配置选项说明

### CustomUploadOptions

| 选项                   | 类型       | 说明                               |
| ---------------------- | ---------- | ---------------------------------- |
| `maxFileSize`          | `number`   | 单个文件最大字节数                 |
| `maxFiles`             | `number`   | 单次请求最多文件数                 |
| `allowedMimeTypes`     | `string[]` | 允许的 MIME 类型列表               |
| `subDir`               | `string`   | 子目录名称（相对于 `UPLOAD_DEST`） |
| `preserveOriginalName` | `boolean`  | 是否保留原始文件名                 |

### 文件大小参考

```typescript
1 KB  = 1024
1 MB  = 1024 * 1024        = 1048576
5 MB  = 5 * 1024 * 1024    = 5242880
10 MB = 10 * 1024 * 1024   = 10485760
100 MB = 100 * 1024 * 1024 = 104857600
```

## 🌟 实战案例

### 案例 1：用户模块

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly uploadConfigService: UploadConfigService) {}

  // 更新头像
  @Post(':id/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', this.uploadConfigService.getConfig('avatar')),
  )
  updateAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // TODO: 更新用户头像
    return { avatarUrl: `/uploads/avatars/${file.filename}` };
  }

  // 上传身份证照片
  @Post(':id/id-card')
  @UseInterceptors(
    FileInterceptor(
      'idCard',
      this.uploadConfigService.getConfig('image', {
        maxFileSize: 3 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        subDir: 'id-cards',
      }),
    ),
  )
  uploadIdCard(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // TODO: OCR 识别身份证
    return { filename: file.filename };
  }
}
```

### 案例 2：文章模块

```typescript
@Controller('articles')
export class ArticlesController {
  constructor(private readonly uploadConfigService: UploadConfigService) {}

  // 上传封面图
  @Post('cover')
  @UseInterceptors(
    FileInterceptor(
      'cover',
      this.uploadConfigService.getConfig('image', {
        maxFileSize: 2 * 1024 * 1024,
        subDir: 'article-covers',
      }),
    ),
  )
  uploadCover(@UploadedFile() file: Express.Multer.File) {
    return { url: `/uploads/article-covers/${file.filename}` };
  }

  // 富文本编辑器批量上传图片
  @Post('images')
  @UseInterceptors(
    FilesInterceptor(
      'images',
      10,
      this.uploadConfigService.getConfig('image', {
        maxFileSize: 1 * 1024 * 1024,
        subDir: 'article-images',
      }),
    ),
  )
  uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    return {
      urls: files.map(file => `/uploads/article-images/${file.filename}`),
    };
  }

  // 上传附件
  @Post('attachments')
  @UseInterceptors(
    FilesInterceptor(
      'files',
      5,
      this.uploadConfigService.getConfig('document', {
        subDir: 'article-attachments',
      }),
    ),
  )
  uploadAttachments(@UploadedFiles() files: Express.Multer.File[]) {
    return {
      files: files.map(file => ({
        name: file.originalname,
        url: `/uploads/article-attachments/${file.filename}`,
        size: file.size,
      })),
    };
  }
}
```

### 案例 3：数据导入

```typescript
@Controller('imports')
export class DataImportController {
  constructor(private readonly uploadConfigService: UploadConfigService) {}

  // 导入 Excel
  @Post('excel')
  @UseInterceptors(
    FileInterceptor(
      'file',
      this.uploadConfigService.getCustomConfig({
        maxFileSize: 10 * 1024 * 1024,
        allowedMimeTypes: [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        subDir: 'imports/excel',
        preserveOriginalName: true,
      }),
    ),
  )
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    // TODO: 解析 Excel 文件
    return { filename: file.originalname };
  }

  // 导入 CSV
  @Post('csv')
  @UseInterceptors(
    FileInterceptor(
      'file',
      this.uploadConfigService.getCustomConfig({
        maxFileSize: 5 * 1024 * 1024,
        allowedMimeTypes: ['text/csv'],
        subDir: 'imports/csv',
      }),
    ),
  )
  async importCsv(@UploadedFile() file: Express.Multer.File) {
    // TODO: 解析 CSV 文件
    return { path: file.path };
  }
}
```

## ⚠️ 注意事项

### 1. 文件上传 vs 请求体大小

**区别说明**：

- **请求体大小限制**（`app.bodyLimit.*`）：针对 JSON、表单等非文件上传请求
- **文件上传限制**（`upload.*`）：针对 `multipart/form-data` 文件上传

```typescript
// main.ts 中的请求体限制（不处理文件上传）
app.use(express.json({ limit: '10mb' }));           // JSON 请求体
app.use(express.urlencoded({ limit: '10mb' }));     // 表单请求体

// 文件上传由 Multer 处理（通过 UploadConfigService）
@UseInterceptors(FileInterceptor('file', config))
```

### 2. 目录权限

确保应用有权限在 `UPLOAD_DEST` 目录下创建文件：

```bash
# Linux/Mac
chmod -R 755 ./uploads

# Docker
volumes:
  - ./uploads:/app/uploads
```

### 3. 文件名冲突

默认使用时间戳 + 随机数生成唯一文件名，避免冲突：

```
image-1634567890123-123456789.jpg
doc-1634567890456-987654321.pdf
```

如需保留原始文件名，设置 `preserveOriginalName: true`，但需自行处理重名问题。

### 4. 安全建议

```typescript
// ✅ 推荐：严格限制文件类型
allowedMimeTypes: ['image/jpeg', 'image/png'];

// ❌ 不推荐：允许所有类型
allowedMimeTypes: []; // 不设置或空数组
```

## 🔗 相关文档

- [文件上传使用指南](../guides/file-upload-usage.md)
- [环境变量配置](../../.env.example)
- [Common Services 说明](../../src/common/services/README.md)

---

**维护者**: XSIJIE
**最后更新**: 2025-10-23
