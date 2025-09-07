import { registerAs } from '@nestjs/config';

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
