import { registerAs } from '@nestjs/config';

/**
 * 安全配置
 * 包含密码加密、会话、CSRF、设备登录限制等安全相关配置
 */
export const securityConfig = registerAs('security', () => {
  // 读取最大并发会话数配置，并进行边界校验
  let maxConcurrentSessions = parseInt(process.env.MAX_CONCURRENT_SESSIONS, 10);

  // 边界校验：最小值 1，最大值 10，默认值 5
  if (isNaN(maxConcurrentSessions) || maxConcurrentSessions < 1) {
    maxConcurrentSessions = 5;
  } else if (maxConcurrentSessions > 10) {
    maxConcurrentSessions = 10;
  }

  return {
    // 密码加密
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    },

    // 会话配置
    session: {
      secret:
        process.env.SESSION_SECRET ||
        'default-session-secret-change-in-production',
      // 最大并发登录设备数 (1=单设备登录, 2-10=多设备登录)
      maxConcurrentSessions,
    },

    // CSRF 配置
    csrf: {
      secret:
        process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
    },
  };
});
