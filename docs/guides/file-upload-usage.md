# 文件上传使用指南

> 完整的文件上传配置和使用示例

## 📋 目录

- [配置说明](#配置说明)
- [基础使用](#基础使用)
- [不同类型文件上传](#不同类型文件上传)
- [文件验证](#文件验证)
- [云存储集成](#云存储集成)
- [最佳实践](#最佳实践)

## 配置说明

### 环境变量配置

文件上传配置位于 `.env` 文件中，包含以下几个部分：

#### 1. 请求体大小限制（JSON 和表单）

```bash
# main.ts 中的配置
# 这些限制只针对 JSON 和 URL 编码的表单数据，不包括文件上传
express.json({ limit: '10mb' })              # JSON 请求体: 10MB
express.urlencoded({ limit: '10mb' })        # 表单数据: 10MB
```

**适用场景:**

- ✅ JSON API 请求
- ✅ 传统 HTML 表单提交（`application/x-www-form-urlencoded`）
- ❌ 文件上传（需要使用 multer）

#### 2. 文件上传配置

```bash
# 基础配置
UPLOAD_DEST=./uploads                              # 上传目录
UPLOAD_MAX_FILE_SIZE=10485760                      # 单文件最大: 10MB
UPLOAD_MAX_FILES=10                                # 单次最多文件数
UPLOAD_MAX_TOTAL_SIZE=52428800                     # 单次总大小: 50MB

# 图片上传
UPLOAD_IMAGE_MAX_SIZE=5242880                      # 5MB
UPLOAD_IMAGE_ALLOWED_TYPES=image/jpeg,image/png,image/webp

# 文档上传
UPLOAD_DOCUMENT_MAX_SIZE=10485760                  # 10MB
UPLOAD_DOCUMENT_ALLOWED_TYPES=application/pdf,application/msword

# 头像上传
UPLOAD_AVATAR_MAX_SIZE=2097152                     # 2MB
UPLOAD_AVATAR_ENABLE_COMPRESSION=true              # 启用压缩
UPLOAD_AVATAR_WIDTH=200                            # 尺寸: 200x200
```

### TypeScript 配置文件

所有上传配置已集成到 `src/config/upload.config.ts`：

```typescript
import { ConfigService } from '@nestjs/config';

// 在 Service 或 Controller 中使用
constructor(private configService: ConfigService) {}

// 获取配置
const maxFileSize = this.configService.get('upload.maxFileSize');
const imageMaxSize = this.configService.get('upload.image.maxSize');
const avatarConfig = this.configService.get('upload.avatar');
```

## 基础使用

### 1. 单文件上传

```typescript
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

@Controller('upload')
export class UploadController {
  constructor(private configService: ConfigService) {}

  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  uploadSingleFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 10 * 1024 * 1024, // 10MB
          }),
          new FileTypeValidator({
            fileType: 'image/*',
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return {
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
```

### 2. 多文件上传

```typescript
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  @Post('multiple')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      // 最多10个文件
      limits: {
        fileSize: 5 * 1024 * 1024, // 每个文件5MB
      },
    }),
  )
  uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return files.map(file => ({
      filename: file.filename,
      size: file.size,
    }));
  }
}
```

### 3. 多字段文件上传

```typescript
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  @Post('fields')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'photos', maxCount: 5 },
      { name: 'documents', maxCount: 3 },
    ]),
  )
  uploadFields(
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      photos?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    },
  ) {
    return {
      avatar: files.avatar?.[0],
      photos: files.photos?.length,
      documents: files.documents?.length,
    };
  }
}
```

## 不同类型文件上传

### 图片上传（带压缩）

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as sharp from 'sharp';

@Injectable()
export class ImageUploadService {
  constructor(private configService: ConfigService) {}

  getMulterOptions() {
    const imageConfig = this.configService.get('upload.image');

    return {
      storage: diskStorage({
        destination: imageConfig.subDir,
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
          );
        },
      }),
      limits: {
        fileSize: imageConfig.maxSize,
      },
      fileFilter: (req, file, cb) => {
        if (!imageConfig.allowedTypes.includes(file.mimetype)) {
          return cb(new Error('不支持的图片格式'), false);
        }
        cb(null, true);
      },
    };
  }

  async compressImage(filePath: string): Promise<void> {
    const imageConfig = this.configService.get('upload.image');

    if (imageConfig.enableCompression) {
      await sharp(filePath)
        .resize(imageConfig.maxWidth, imageConfig.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: imageConfig.compressionQuality })
        .toFile(filePath + '.compressed');

      // 替换原文件
      // fs.renameSync(filePath + '.compressed', filePath);
    }
  }
}
```

### 头像上传示例

```typescript
@Controller('users')
export class UsersController {
  constructor(
    private configService: ConfigService,
    private imageService: ImageUploadService,
  ) {}

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Param('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: this.configService.get('upload.avatar.maxSize'),
          }),
          new FileTypeValidator({
            fileType: /image\/(jpeg|jpg|png|webp)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // 压缩头像
    await this.imageService.compressImage(file.path);

    // 保存到数据库
    // await this.usersService.updateAvatar(userId, file.filename);

    return {
      message: '头像上传成功',
      filename: file.filename,
      url: `${this.configService.get('upload.storage.local.urlPrefix')}/${file.filename}`,
    };
  }
}
```

### 文档上传示例

```typescript
@Controller('documents')
export class DocumentsController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('document'))
  uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: this.configService.get('upload.document.maxSize'),
          }),
          new FileTypeValidator({
            fileType: 'application/pdf',
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return {
      message: '文档上传成功',
      filename: file.filename,
      size: file.size,
    };
  }
}
```

## 文件验证

### 自定义文件验证器

```typescript
import { FileValidator } from '@nestjs/common';

export class CustomFileValidator extends FileValidator {
  constructor(
    protected readonly validationOptions: {
      allowedMimeTypes: string[];
      maxSize: number;
    },
  ) {
    super(validationOptions);
  }

  isValid(file: Express.Multer.File): boolean {
    // 验证 MIME 类型
    if (!this.validationOptions.allowedMimeTypes.includes(file.mimetype)) {
      return false;
    }

    // 验证文件大小
    if (file.size > this.validationOptions.maxSize) {
      return false;
    }

    return true;
  }

  buildErrorMessage(): string {
    return `文件必须是以下类型之一: ${this.validationOptions.allowedMimeTypes.join(', ')}，且大小不超过 ${this.validationOptions.maxSize} 字节`;
  }
}
```

### 使用自定义验证器

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadFile(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new CustomFileValidator({
          allowedMimeTypes: ['image/jpeg', 'image/png'],
          maxSize: 5 * 1024 * 1024,
        }),
      ],
    }),
  )
  file: Express.Multer.File,
) {
  return file;
}
```

## 云存储集成

### AWS S3 示例

```typescript
import { S3 } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

@Injectable()
export class S3UploadService {
  private s3Client: S3;

  constructor(private configService: ConfigService) {
    const s3Config = this.configService.get('upload.storage.s3');

    this.s3Client = new S3({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
      endpoint: s3Config.endpoint,
    });
  }

  async uploadToS3(file: Express.Multer.File): Promise<string> {
    const s3Config = this.configService.get('upload.storage.s3');
    const key = `${Date.now()}-${file.originalname}`;

    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: s3Config.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      },
    });

    await upload.done();

    return `${s3Config.urlPrefix}/${key}`;
  }
}
```

### 使用 S3 上传

```typescript
@Controller('upload')
export class UploadController {
  constructor(private s3Service: S3UploadService) {}

  @Post('s3')
  @UseInterceptors(FileInterceptor('file'))
  async uploadToS3(@UploadedFile() file: Express.Multer.File) {
    const url = await this.s3Service.uploadToS3(file);

    return {
      message: '上传成功',
      url,
    };
  }
}
```

## 最佳实践

### 1. 文件大小限制策略

```typescript
// ✅ 推荐：不同文件类型使用不同的大小限制
const limits = {
  avatar: 2 * 1024 * 1024, // 2MB
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
};

// ❌ 不推荐：所有文件使用相同限制
const limit = 50 * 1024 * 1024; // 50MB
```

### 2. 文件类型验证

```typescript
// ✅ 推荐：使用 MIME 类型 + 文件扩展名双重验证
const isValidFile = (file: Express.Multer.File) => {
  const validMimeTypes = ['image/jpeg', 'image/png'];
  const validExtensions = ['.jpg', '.jpeg', '.png'];

  return (
    validMimeTypes.includes(file.mimetype) &&
    validExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext))
  );
};

// ❌ 不推荐：只验证扩展名（容易被绕过）
const isValidFile = (file: Express.Multer.File) => {
  return file.originalname.endsWith('.jpg');
};
```

### 3. 安全建议

```typescript
// ✅ 使用随机文件名，避免路径遍历攻击
const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${extname(file.originalname)}`;

// ✅ 验证文件真实类型（通过文件头）
import * as fileType from 'file-type';
const type = await fileType.fromBuffer(file.buffer);

// ✅ 病毒扫描（生产环境）
if (process.env.UPLOAD_ENABLE_VIRUS_SCAN === 'true') {
  await virusScanner.scan(file.path);
}

// ✅ 限制文件存储位置
const uploadDir = path.resolve('./uploads');
const filePath = path.join(uploadDir, filename);
if (!filePath.startsWith(uploadDir)) {
  throw new Error('Invalid file path');
}
```

### 4. 错误处理

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  try {
    // 上传逻辑
    return { success: true };
  } catch (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      throw new BadRequestException('文件大小超出限制');
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      throw new BadRequestException('文件数量超出限制');
    }
    throw new InternalServerErrorException('文件上传失败');
  }
}
```

### 5. 配置文件管理

```typescript
// ✅ 推荐：从配置服务读取
constructor(private configService: ConfigService) {
  this.maxFileSize = this.configService.get('upload.maxFileSize');
}

// ❌ 不推荐：硬编码
const maxFileSize = 10485760;
```

## 常见问题

### Q1: 为什么上传大文件失败？

**A:** 检查以下配置：

1. `express.json()` 和 `express.urlencoded()` 的 `limit` 设置（这个**不影响**文件上传）
2. `UPLOAD_MAX_FILE_SIZE` 环境变量
3. Nginx 的 `client_max_body_size` 配置
4. 云存储服务商的限制

### Q2: 如何区分 JSON 限制和文件上传限制？

**A:**

- `express.json({ limit: '10mb' })` → JSON 请求体限制
- `express.urlencoded({ limit: '10mb' })` → 表单数据限制
- `FileInterceptor(..., { limits: { fileSize: xxx } })` → 文件上传限制

### Q3: 如何实现进度条？

**A:** 使用前端库（如 axios）监听上传进度：

```typescript
// 前端
const formData = new FormData();
formData.append('file', file);

axios.post('/upload', formData, {
  onUploadProgress: progressEvent => {
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total,
    );
    console.log(percentCompleted);
  },
});
```

## 相关文档

- [NestJS 文件上传官方文档](https://docs.nestjs.com/techniques/file-upload)
- [Multer 文档](https://github.com/expressjs/multer)
- [Sharp 图片处理库](https://sharp.pixelplumbing.com/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)

---

**维护者**: XSIJIE  
**最后更新**: 2025-10-23
