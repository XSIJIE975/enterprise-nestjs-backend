import { registerAs } from '@nestjs/config';

/**
 * 安全配置
 * 包含密码加密、会话、CSRF 等安全相关配置
 */
export const securityConfig = registerAs('security', () => ({
  // 密码加密
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  },

  // 会话配置
  session: {
    secret:
      process.env.SESSION_SECRET ||
      'default-session-secret-change-in-production',
  },

  // CSRF 配置
  csrf: {
    secret:
      process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
  },
}));
