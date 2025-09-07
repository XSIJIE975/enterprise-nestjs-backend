import { registerAs } from '@nestjs/config';

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
