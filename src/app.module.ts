import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';

// 配置
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { redisConfig } from './config/redis.config';

// 共享模块
import { DatabaseModule } from './shared/database/database.module';
import { LoggerModule } from './shared/logger/logger.module';
import { CacheModule } from './shared/cache/cache.module';

// 业务模块
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PublicApiModule } from './modules/public-api/public-api.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig],
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env.local',
        '.env',
      ],
      expandVariables: true,
    }),

    // 限流模块
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1秒
        limit: 10, // 1秒内最多10次请求
      },
      {
        name: 'medium',
        ttl: 60000, // 1分钟
        limit: 100, // 1分钟内最多100次请求
      },
      {
        name: 'long',
        ttl: 3600000, // 1小时
        limit: 1000, // 1小时内最多1000次请求
      },
    ]),

    // 定时任务模块
    ScheduleModule.forRoot(),

    // 健康检查模块
    TerminusModule,

    // 共享模块
    DatabaseModule,
    LoggerModule,
    CacheModule,

    // 业务模块
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    PublicApiModule,
    HealthModule,
  ],
})
export class AppModule {}
