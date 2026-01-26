import { SetMetadata } from '@nestjs/common';

/**
 * CSRF 跳过装饰器元数据键
 */
export const SKIP_CSRF_KEY = 'skip_csrf';

/**
 * 跳过 CSRF 校验
 * 可用于 Controller 类或方法
 */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);
