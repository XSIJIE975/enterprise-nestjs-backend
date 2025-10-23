import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * 文件上传场景类型
 */
export type UploadScenario =
  | 'image' // 图片上传
  | 'document' // 文档上传
  | 'video' // 视频上传
  | 'audio' // 音频上传
  | 'avatar' // 头像上传
  | 'general'; // 通用上传

/**
 * 自定义上传配置选项
 */
export interface CustomUploadOptions {
  /** 最大文件大小（字节） */
  maxFileSize?: number;
  /** 最大文件数量 */
  maxFiles?: number;
  /** 允许的 MIME 类型 */
  allowedMimeTypes?: string[];
  /** 子目录名称 */
  subDir?: string;
  /** 是否保留原始文件名 */
  preserveOriginalName?: boolean;
}

/**
 * 文件上传配置服务
 * 提供预设场景配置和自定义配置支持
 *
 * @example
 * // 在控制器中注入使用
 * constructor(private readonly uploadConfigService: UploadConfigService) {}
 *
 * // 使用预设配置
 * @UseInterceptors(FileInterceptor('file', this.uploadConfigService.getConfig('image')))
 *
 * // 使用预设配置 + 自定义覆盖
 * @UseInterceptors(FileInterceptor('file', this.uploadConfigService.getConfig('image', {
 *   maxFileSize: 3 * 1024 * 1024, // 覆盖为 3MB
 *   subDir: 'products'             // 自定义子目录
 * })))
 *
 * // 完全自定义配置
 * @UseInterceptors(FileInterceptor('file', this.uploadConfigService.getCustomConfig({
 *   maxFileSize: 5 * 1024 * 1024,
 *   maxFiles: 5,
 *   allowedMimeTypes: ['image/png', 'image/jpeg'],
 *   subDir: 'custom',
 *   preserveOriginalName: true
 * })))
 */
@Injectable()
export class UploadConfigService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 获取预设场景的上传配置
   *
   * @param scenario 上传场景类型
   * @param overrides 可选的配置覆盖项
   * @returns Multer 配置对象
   */
  getConfig(
    scenario: UploadScenario,
    overrides?: CustomUploadOptions,
  ): MulterOptions {
    // 获取预设配置
    const presetConfig = this.getPresetConfig(scenario);

    // 合并自定义配置
    if (overrides) {
      return this.mergeConfig(presetConfig, overrides);
    }

    return presetConfig;
  }

  /**
   * 获取完全自定义的上传配置
   *
   * @param options 自定义配置选项
   * @returns Multer 配置对象
   */
  getCustomConfig(options: CustomUploadOptions): MulterOptions {
    const baseConfig = this.getBaseConfig();

    return this.mergeConfig(baseConfig, options);
  }

  /**
   * 获取预设场景配置
   */
  private getPresetConfig(scenario: UploadScenario): MulterOptions {
    switch (scenario) {
      case 'image':
        return this.getImageConfig();
      case 'document':
        return this.getDocumentConfig();
      case 'video':
        return this.getVideoConfig();
      case 'audio':
        return this.getAudioConfig();
      case 'avatar':
        return this.getAvatarConfig();
      case 'general':
      default:
        return this.getGeneralConfig();
    }
  }

  /**
   * 基础配置（通用）
   */
  private getBaseConfig(): MulterOptions {
    const uploadDest = this.configService.get<string>('upload.dest');
    const maxFileSize = this.configService.get<number>('upload.maxFileSize');
    const maxFiles = this.configService.get<number>('upload.maxFiles');
    const allowedMimeTypes = this.configService.get<string[]>(
      'upload.allowedMimeTypes',
    );
    const preserveOriginalName = this.configService.get<boolean>(
      'upload.preserveOriginalName',
    );

    return {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dest = uploadDest || './uploads';
          this.ensureDirectoryExists(dest);
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          if (preserveOriginalName) {
            cb(null, file.originalname);
          } else {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = extname(file.originalname);
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
          }
        },
      }),
      limits: {
        fileSize: maxFileSize,
        files: maxFiles,
      },
      fileFilter: (req, file, cb) => {
        if (allowedMimeTypes && allowedMimeTypes.length > 0) {
          if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(
              new Error(
                `不支持的文件类型: ${file.mimetype}. 允许的类型: ${allowedMimeTypes.join(', ')}`,
              ),
              false,
            );
          }
        } else {
          cb(null, true);
        }
      },
    };
  }

  /**
   * 通用上传配置
   */
  private getGeneralConfig(): MulterOptions {
    return this.getBaseConfig();
  }

  /**
   * 图片上传配置
   */
  private getImageConfig(): MulterOptions {
    const uploadDest = this.configService.get<string>('upload.dest');
    const maxFileSize = this.configService.get<number>('upload.image.maxSize');
    const allowedTypes = this.configService.get<string[]>(
      'upload.image.allowedTypes',
    );
    const subDir = this.configService.get<string>('upload.image.subDir');
    const preserveOriginalName = this.configService.get<boolean>(
      'upload.preserveOriginalName',
    );

    const destination = join(uploadDest || './uploads', subDir || 'images');

    return {
      storage: diskStorage({
        destination: (req, file, cb) => {
          this.ensureDirectoryExists(destination);
          cb(null, destination);
        },
        filename: (req, file, cb) => {
          if (preserveOriginalName) {
            cb(null, file.originalname);
          } else {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = extname(file.originalname);
            cb(null, `image-${uniqueSuffix}${ext}`);
          }
        },
      }),
      limits: {
        fileSize: maxFileSize,
      },
      fileFilter: (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              `不支持的图片格式: ${file.mimetype}. 允许: ${allowedTypes.join(', ')}`,
            ),
            false,
          );
        }
      },
    };
  }

  /**
   * 文档上传配置
   */
  private getDocumentConfig(): MulterOptions {
    const uploadDest = this.configService.get<string>('upload.dest');
    const maxFileSize = this.configService.get<number>(
      'upload.document.maxSize',
    );
    const allowedTypes = this.configService.get<string[]>(
      'upload.document.allowedTypes',
    );
    const subDir = this.configService.get<string>('upload.document.subDir');
    const preserveOriginalName = this.configService.get<boolean>(
      'upload.preserveOriginalName',
    );

    const destination = join(uploadDest || './uploads', subDir || 'documents');

    return {
      storage: diskStorage({
        destination: (req, file, cb) => {
          this.ensureDirectoryExists(destination);
          cb(null, destination);
        },
        filename: (req, file, cb) => {
          if (preserveOriginalName) {
            cb(null, file.originalname);
          } else {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = extname(file.originalname);
            cb(null, `doc-${uniqueSuffix}${ext}`);
          }
        },
      }),
      limits: {
        fileSize: maxFileSize,
      },
      fileFilter: (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              `不支持的文档格式: ${file.mimetype}. 允许: ${allowedTypes.join(', ')}`,
            ),
            false,
          );
        }
      },
    };
  }

  /**
   * 视频上传配置
   */
  private getVideoConfig(): MulterOptions {
    const uploadDest = this.configService.get<string>('upload.dest');
    const maxFileSize = this.configService.get<number>('upload.video.maxSize');
    const allowedTypes = this.configService.get<string[]>(
      'upload.video.allowedTypes',
    );
    const subDir = this.configService.get<string>('upload.video.subDir');
    const preserveOriginalName = this.configService.get<boolean>(
      'upload.preserveOriginalName',
    );

    const destination = join(uploadDest || './uploads', subDir || 'videos');

    return {
      storage: diskStorage({
        destination: (req, file, cb) => {
          this.ensureDirectoryExists(destination);
          cb(null, destination);
        },
        filename: (req, file, cb) => {
          if (preserveOriginalName) {
            cb(null, file.originalname);
          } else {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = extname(file.originalname);
            cb(null, `video-${uniqueSuffix}${ext}`);
          }
        },
      }),
      limits: {
        fileSize: maxFileSize,
      },
      fileFilter: (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              `不支持的视频格式: ${file.mimetype}. 允许: ${allowedTypes.join(', ')}`,
            ),
            false,
          );
        }
      },
    };
  }

  /**
   * 音频上传配置
   */
  private getAudioConfig(): MulterOptions {
    const uploadDest = this.configService.get<string>('upload.dest');
    const maxFileSize = this.configService.get<number>('upload.audio.maxSize');
    const allowedTypes = this.configService.get<string[]>(
      'upload.audio.allowedTypes',
    );
    const subDir = this.configService.get<string>('upload.audio.subDir');
    const preserveOriginalName = this.configService.get<boolean>(
      'upload.preserveOriginalName',
    );

    const destination = join(uploadDest || './uploads', subDir || 'audios');

    return {
      storage: diskStorage({
        destination: (req, file, cb) => {
          this.ensureDirectoryExists(destination);
          cb(null, destination);
        },
        filename: (req, file, cb) => {
          if (preserveOriginalName) {
            cb(null, file.originalname);
          } else {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = extname(file.originalname);
            cb(null, `audio-${uniqueSuffix}${ext}`);
          }
        },
      }),
      limits: {
        fileSize: maxFileSize,
      },
      fileFilter: (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              `不支持的音频格式: ${file.mimetype}. 允许: ${allowedTypes.join(', ')}`,
            ),
            false,
          );
        }
      },
    };
  }

  /**
   * 头像上传配置
   */
  private getAvatarConfig(): MulterOptions {
    const uploadDest = this.configService.get<string>('upload.dest');
    const maxFileSize = this.configService.get<number>('upload.avatar.maxSize');
    const allowedTypes = this.configService.get<string[]>(
      'upload.avatar.allowedTypes',
    );
    const subDir = this.configService.get<string>('upload.avatar.subDir');
    const preserveOriginalName = this.configService.get<boolean>(
      'upload.preserveOriginalName',
    );

    const destination = join(uploadDest || './uploads', subDir || 'avatars');

    return {
      storage: diskStorage({
        destination: (req, file, cb) => {
          this.ensureDirectoryExists(destination);
          cb(null, destination);
        },
        filename: (req, file, cb) => {
          if (preserveOriginalName) {
            cb(null, file.originalname);
          } else {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = extname(file.originalname);
            cb(null, `avatar-${uniqueSuffix}${ext}`);
          }
        },
      }),
      limits: {
        fileSize: maxFileSize,
      },
      fileFilter: (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              `不支持的头像格式: ${file.mimetype}. 允许: ${allowedTypes.join(', ')}`,
            ),
            false,
          );
        }
      },
    };
  }

  /**
   * 合并配置（自定义配置覆盖预设配置）
   */
  private mergeConfig(
    baseConfig: MulterOptions,
    overrides: CustomUploadOptions,
  ): MulterOptions {
    const uploadDest = this.configService.get<string>('upload.dest');

    const merged: MulterOptions = { ...baseConfig };

    // 处理文件大小限制覆盖
    if (overrides.maxFileSize !== undefined) {
      merged.limits = {
        ...merged.limits,
        fileSize: overrides.maxFileSize,
      };
    }

    // 处理文件数量限制覆盖
    if (overrides.maxFiles !== undefined) {
      merged.limits = {
        ...merged.limits,
        files: overrides.maxFiles,
      };
    }

    // 处理 MIME 类型覆盖
    if (overrides.allowedMimeTypes) {
      merged.fileFilter = (req, file, cb) => {
        if (overrides.allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              `不支持的文件类型: ${file.mimetype}. 允许: ${overrides.allowedMimeTypes.join(', ')}`,
            ),
            false,
          );
        }
      };
    }

    // 处理子目录和文件名覆盖
    if (
      overrides.subDir !== undefined ||
      overrides.preserveOriginalName !== undefined
    ) {
      const preserveName =
        overrides.preserveOriginalName ??
        this.configService.get<boolean>('upload.preserveOriginalName');
      const destination = overrides.subDir
        ? join(uploadDest || './uploads', overrides.subDir)
        : (baseConfig.storage as any).getDestination?.() || uploadDest;

      merged.storage = diskStorage({
        destination: (req, file, cb) => {
          this.ensureDirectoryExists(destination);
          cb(null, destination);
        },
        filename: (req, file, cb) => {
          if (preserveName) {
            cb(null, file.originalname);
          } else {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = extname(file.originalname);
            cb(null, `file-${uniqueSuffix}${ext}`);
          }
        },
      });
    }

    return merged;
  }

  /**
   * 确保目录存在，不存在则创建
   */
  private ensureDirectoryExists(directory: string): void {
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
  }
}
