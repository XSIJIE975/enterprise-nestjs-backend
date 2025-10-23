import { registerAs } from '@nestjs/config';

/**
 * 文件上传配置
 * 包含上传目录、文件大小限制、允许的文件类型等
 */
export const uploadConfig = registerAs('upload', () => ({
  // ==================== 基础配置 ====================

  /** 上传文件存储目录 */
  dest: process.env.UPLOAD_DEST || './uploads',

  /** 临时文件目录 */
  tempDir: process.env.UPLOAD_TEMP_DIR || './uploads/temp',

  /** 是否保留原始文件名 */
  preserveOriginalName:
    process.env.UPLOAD_PRESERVE_ORIGINAL_NAME === 'true' || false,

  // ==================== 通用文件上传限制 ====================

  /**
   * 单个文件最大大小（字节）
   * @default 10485760 (10MB)
   */
  maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE, 10) || 10485760,

  /**
   * 单次请求最多上传文件数
   * @default 10
   */
  maxFiles: parseInt(process.env.UPLOAD_MAX_FILES, 10) || 10,

  /**
   * 单次请求总文件大小限制（字节）
   * @default 52428800 (50MB)
   */
  maxTotalSize: parseInt(process.env.UPLOAD_MAX_TOTAL_SIZE, 10) || 52428800,

  /**
   * 允许的 MIME 类型（通用）
   */
  allowedMimeTypes: process.env.UPLOAD_ALLOWED_MIMETYPES
    ? process.env.UPLOAD_ALLOWED_MIMETYPES.split(',').map(type => type.trim())
    : [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
      ],

  // ==================== 图片上传配置 ====================

  image: {
    /** 图片文件最大大小（字节）@default 5242880 (5MB) */
    maxSize: parseInt(process.env.UPLOAD_IMAGE_MAX_SIZE, 10) || 5242880,

    /** 允许的图片类型 */
    allowedTypes: process.env.UPLOAD_IMAGE_ALLOWED_TYPES
      ? process.env.UPLOAD_IMAGE_ALLOWED_TYPES.split(',').map(type =>
          type.trim(),
        )
      : ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],

    /** 图片上传子目录 */
    subDir: process.env.UPLOAD_IMAGE_SUB_DIR || 'images',

    /** 是否启用图片压缩 */
    enableCompression:
      process.env.UPLOAD_IMAGE_ENABLE_COMPRESSION === 'true' || false,

    /** 压缩质量 (0-100) */
    compressionQuality:
      parseInt(process.env.UPLOAD_IMAGE_COMPRESSION_QUALITY, 10) || 80,

    /** 最大宽度（像素）超过则自动缩放 */
    maxWidth: parseInt(process.env.UPLOAD_IMAGE_MAX_WIDTH, 10) || 2048,

    /** 最大高度（像素）超过则自动缩放 */
    maxHeight: parseInt(process.env.UPLOAD_IMAGE_MAX_HEIGHT, 10) || 2048,
  },

  // ==================== 文档上传配置 ====================

  document: {
    /** 文档文件最大大小（字节）@default 10485760 (10MB) */
    maxSize: parseInt(process.env.UPLOAD_DOCUMENT_MAX_SIZE, 10) || 10485760,

    /** 允许的文档类型 */
    allowedTypes: process.env.UPLOAD_DOCUMENT_ALLOWED_TYPES
      ? process.env.UPLOAD_DOCUMENT_ALLOWED_TYPES.split(',').map(type =>
          type.trim(),
        )
      : [
          'application/pdf',
          'application/msword', // .doc
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
          'application/vnd.ms-excel', // .xls
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'text/plain', // .txt
        ],

    /** 文档上传子目录 */
    subDir: process.env.UPLOAD_DOCUMENT_SUB_DIR || 'documents',
  },

  // ==================== 视频上传配置 ====================

  video: {
    /** 视频文件最大大小（字节）@default 104857600 (100MB) */
    maxSize: parseInt(process.env.UPLOAD_VIDEO_MAX_SIZE, 10) || 104857600,

    /** 允许的视频类型 */
    allowedTypes: process.env.UPLOAD_VIDEO_ALLOWED_TYPES
      ? process.env.UPLOAD_VIDEO_ALLOWED_TYPES.split(',').map(type =>
          type.trim(),
        )
      : ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'],

    /** 视频上传子目录 */
    subDir: process.env.UPLOAD_VIDEO_SUB_DIR || 'videos',
  },

  // ==================== 音频上传配置 ====================

  audio: {
    /** 音频文件最大大小（字节）@default 20971520 (20MB) */
    maxSize: parseInt(process.env.UPLOAD_AUDIO_MAX_SIZE, 10) || 20971520,

    /** 允许的音频类型 */
    allowedTypes: process.env.UPLOAD_AUDIO_ALLOWED_TYPES
      ? process.env.UPLOAD_AUDIO_ALLOWED_TYPES.split(',').map(type =>
          type.trim(),
        )
      : ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg'],

    /** 音频上传子目录 */
    subDir: process.env.UPLOAD_AUDIO_SUB_DIR || 'audios',
  },

  // ==================== 头像上传配置 ====================

  avatar: {
    /** 头像文件最大大小（字节）@default 2097152 (2MB) */
    maxSize: parseInt(process.env.UPLOAD_AVATAR_MAX_SIZE, 10) || 2097152,

    /** 允许的头像类型 */
    allowedTypes: process.env.UPLOAD_AVATAR_ALLOWED_TYPES
      ? process.env.UPLOAD_AVATAR_ALLOWED_TYPES.split(',').map(type =>
          type.trim(),
        )
      : ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],

    /** 头像上传子目录 */
    subDir: process.env.UPLOAD_AVATAR_SUB_DIR || 'avatars',

    /** 是否启用头像压缩 */
    enableCompression:
      process.env.UPLOAD_AVATAR_ENABLE_COMPRESSION === 'true' || true,

    /** 压缩质量 (0-100) */
    compressionQuality:
      parseInt(process.env.UPLOAD_AVATAR_COMPRESSION_QUALITY, 10) || 85,

    /** 头像宽度（像素）- 会裁剪为正方形 */
    width: parseInt(process.env.UPLOAD_AVATAR_WIDTH, 10) || 200,

    /** 头像高度（像素）- 会裁剪为正方形 */
    height: parseInt(process.env.UPLOAD_AVATAR_HEIGHT, 10) || 200,
  },

  // ==================== 安全配置 ====================

  security: {
    /** 是否启用病毒扫描 */
    enableVirusScan: process.env.UPLOAD_ENABLE_VIRUS_SCAN === 'true' || false,

    /** 是否验证文件真实类型（通过文件头验证，防止伪造后缀名） */
    verifyFileType: process.env.UPLOAD_VERIFY_FILE_TYPE === 'true' || true,

    /** 禁止的文件扩展名 */
    deniedExtensions: process.env.UPLOAD_DENIED_EXTENSIONS
      ? process.env.UPLOAD_DENIED_EXTENSIONS.split(',').map(ext => ext.trim())
      : [
          '.exe',
          '.bat',
          '.cmd',
          '.com',
          '.pif',
          '.scr',
          '.vbs',
          '.js',
          '.jar',
          '.sh',
        ],
  },

  // ==================== 存储配置 ====================

  storage: {
    /** 存储类型: local | s3 | oss | cos */
    type:
      (process.env.UPLOAD_STORAGE_TYPE as 'local' | 's3' | 'oss' | 'cos') ||
      'local',

    /** 本地存储配置 */
    local: {
      /** 本地存储路径 */
      path: process.env.UPLOAD_LOCAL_PATH || './uploads',

      /** 文件URL前缀（用于返回访问地址） */
      urlPrefix:
        process.env.UPLOAD_LOCAL_URL_PREFIX || 'http://localhost:8000/uploads',
    },

    /** S3 存储配置（AWS S3 / MinIO 等） */
    s3: {
      endpoint: process.env.UPLOAD_S3_ENDPOINT || '',
      bucket: process.env.UPLOAD_S3_BUCKET || '',
      region: process.env.UPLOAD_S3_REGION || 'us-east-1',
      accessKeyId: process.env.UPLOAD_S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.UPLOAD_S3_SECRET_ACCESS_KEY || '',
      urlPrefix: process.env.UPLOAD_S3_URL_PREFIX || '',
    },

    /** 阿里云 OSS 配置 */
    oss: {
      endpoint: process.env.UPLOAD_OSS_ENDPOINT || '',
      bucket: process.env.UPLOAD_OSS_BUCKET || '',
      region: process.env.UPLOAD_OSS_REGION || '',
      accessKeyId: process.env.UPLOAD_OSS_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.UPLOAD_OSS_ACCESS_KEY_SECRET || '',
      urlPrefix: process.env.UPLOAD_OSS_URL_PREFIX || '',
    },

    /** 腾讯云 COS 配置 */
    cos: {
      secretId: process.env.UPLOAD_COS_SECRET_ID || '',
      secretKey: process.env.UPLOAD_COS_SECRET_KEY || '',
      bucket: process.env.UPLOAD_COS_BUCKET || '',
      region: process.env.UPLOAD_COS_REGION || '',
      urlPrefix: process.env.UPLOAD_COS_URL_PREFIX || '',
    },
  },
}));
