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

    // CSRF 配置（启用 csurf 或 double-submit 策略的情况下）
    csrf: {
      enabled: process.env.CSRF_ENABLED === 'true' || false,
      secret:
        process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
      // CSRF cookie / header 名称
      cookieName: process.env.CSRF_COOKIE_NAME || 'XSRF-TOKEN',
      headerName: process.env.CSRF_HEADER_NAME || 'X-XSRF-TOKEN',
      // CSRF cookie 选项（生产请启用 secure）
      cookieOptions: {
        httpOnly: false, // 必须为 false 以允许前端读取（double-submit）
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.CSRF_COOKIE_SAMESITE || 'lax',
        maxAge:
          parseInt(process.env.CSRF_COOKIE_MAXAGE || '0', 10) || undefined,
      },
      // 白名单路径（用逗号分隔）
      exemptPaths: (process.env.CSRF_EXEMPT_PATHS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
    },
  };
});
