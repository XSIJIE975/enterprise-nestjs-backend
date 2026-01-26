import { registerAs } from '@nestjs/config';
import { z } from 'zod';

/**
 * Database 配置环境变量 Schema
 */
export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().positive().optional(),
  DB_USERNAME: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_DATABASE: z.string().optional(),
  DB_LOGGING: z.string().optional(),
  DB_SYNCHRONIZE: z.string().optional(),
  DB_MAX_CONNECTIONS: z.coerce.number().int().positive().optional(),
  DB_ACQUIRE_TIMEOUT: z.coerce.number().int().positive().optional(),
  DB_TIMEOUT: z.coerce.number().int().positive().optional(),
});

export type DatabaseEnvConfig = z.infer<typeof databaseEnvSchema>;

export const databaseConfig = registerAs('database', () => ({
  url:
    process.env.DATABASE_URL ||
    'mysql://root:password@localhost:3306/nestjs_enterprise',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'nestjs_enterprise',
  logging: process.env.DB_LOGGING === 'true',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS, 10) || 100,
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT, 10) || 60000,
  timeout: parseInt(process.env.DB_TIMEOUT, 10) || 60000,
}));
