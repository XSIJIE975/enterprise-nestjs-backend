import { registerAs } from '@nestjs/config';
import { z } from 'zod';

/**
 * JWT 配置环境变量 Schema
 */
export const jwtEnvSchema = z.object({
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().optional(),
  JWT_ISSUER: z.string().optional(),
  JWT_AUDIENCE: z.string().optional(),
});

export type JwtEnvConfig = z.infer<typeof jwtEnvSchema>;

export const jwtConfig = registerAs('jwt', () => ({
  accessTokenSecret:
    process.env.JWT_ACCESS_SECRET || 'your-access-token-secret-key',
  refreshTokenSecret:
    process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret-key',
  accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  issuer: process.env.JWT_ISSUER || 'enterprise-nestjs-backend',
  audience: process.env.JWT_AUDIENCE || 'enterprise-nestjs-backend',
}));
