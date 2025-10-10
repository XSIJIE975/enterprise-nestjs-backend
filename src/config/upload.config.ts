import { registerAs } from '@nestjs/config';

/**
 * 文件上传配置
 * 包含上传目录、文件大小限制、允许的文件类型等
 */
export const uploadConfig = registerAs('upload', () => ({
  // 上传目录
  dest: process.env.UPLOAD_DEST || './uploads',

  // 文件大小限制（字节）
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760, // 10MB

  // 允许的 MIME 类型
  allowedMimeTypes: process.env.UPLOAD_ALLOWED_MIMETYPES
    ? process.env.UPLOAD_ALLOWED_MIMETYPES.split(',')
    : ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],

  // 图片上传配置
  image: {
    maxSize: parseInt(process.env.UPLOAD_IMAGE_MAX_SIZE, 10) || 5242880, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },

  // 文档上传配置
  document: {
    maxSize: parseInt(process.env.UPLOAD_DOCUMENT_MAX_SIZE, 10) || 10485760, // 10MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
}));
