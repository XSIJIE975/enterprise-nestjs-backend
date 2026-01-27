import { registerAs } from '@nestjs/config';
import { z } from 'zod';

/**
 * Security 配置环境变量 Schema
 */
export const securityEnvSchema = z.object({
  // Bcrypt
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(31).optional(),
  // Session
  SESSION_SECRET: z.string().optional(),
  MAX_CONCURRENT_SESSIONS: z.coerce.number().int().min(1).max(10).optional(),
  // CSRF
  CSRF_ENABLED: z.string().optional(),
  CSRF_SECRET: z.string().optional(),
  CSRF_COOKIE_NAME: z.string().optional(),
  CSRF_HEADER_NAME: z.string().optional(),
  CSRF_COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).optional(),
  CSRF_COOKIE_MAXAGE: z.coerce.number().int().min(0).optional(),
  CSRF_EXEMPT_PATHS: z.string().optional(),
  CSRF_SESSION_COOKIE_NAME: z.string().optional(),
  // Account Lockout
  ACCOUNT_LOCKOUT_ENABLED: z.string().optional(),
  ACCOUNT_LOCKOUT_MAX_ATTEMPTS: z.string().optional(),
  ACCOUNT_LOCKOUT_DURATIONS: z.string().optional(),
});

export type SecurityEnvConfig = z.infer<typeof securityEnvSchema>;

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
      // 用于绑定 CSRF token 的会话标识（Double Submit Cookie Pattern 的 identifier）
      // 由中间件自动创建（httpOnly），前端无需读取
      sessionCookieName: process.env.CSRF_SESSION_COOKIE_NAME || 'csrf.sid',
      // CSRF cookie 选项（生产请启用 secure）
      cookieOptions: {
        httpOnly: false, // 必须为 false 以允许前端读取（double-submit）
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.CSRF_COOKIE_SAMESITE || 'lax',
        maxAge:
          parseInt(process.env.CSRF_COOKIE_MAXAGE || '0', 10) || undefined,
      },
      // 白名单路径（用逗号分隔）
      exemptPaths: Array.from(
        new Set([
          // 默认豁免
          '/health',
          '/mock',
          // 环境变量追加
          ...(process.env.CSRF_EXEMPT_PATHS || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(p => (p.startsWith('/') ? p : `/${p}`)),
        ]),
      ),
    },

    // 账户锁定配置
    accountLockout: {
      enabled: process.env.ACCOUNT_LOCKOUT_ENABLED !== 'false', // 默认启用
      // 失败次数阈值（逗号分隔，例如 "5,10"）
      maxAttempts: (process.env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS || '5,10')
        .split(',')
        .map(n => parseInt(n.trim(), 10))
        .filter(n => !isNaN(n) && n > 0),
      // 锁定时长（秒，逗号分隔，例如 "900,3600" 表示 15分钟,1小时）
      lockDurations: (process.env.ACCOUNT_LOCKOUT_DURATIONS || '900,3600')
        .split(',')
        .map(n => parseInt(n.trim(), 10))
        .filter(n => !isNaN(n) && n > 0),
    },
  };
});
