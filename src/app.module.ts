import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';

// 配置
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  securityConfig,
  throttleConfig,
  uploadConfig,
  mailConfig,
} from './config';

// 共享模块
import { DatabaseModule } from './shared/database/database.module';
import { LoggerModule } from './shared/logger/logger.module';
import { CacheModule } from './shared/cache/cache.module';
import { RequestContextModule } from './shared/request-context/request-context.module';

// 业务模块
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PublicApiModule } from './modules/public-api/public-api.module';
import { HealthModule } from './modules/health/health.module';
import { LogsModule } from './modules/logs/logs.module';

// 中间件
import { LoggerMiddleware } from './common/middlewares/logger.middleware';

// 拦截器
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

// 过滤器
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        redisConfig,
        securityConfig,
        throttleConfig,
        uploadConfig,
        mailConfig,
      ],
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
    RequestContextModule,

    // 业务模块
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    PublicApiModule,
    HealthModule,
    LogsModule,
  ],
  providers: [
    // 全局异常过滤器
    // - 捕获所有未处理的异常并统一响应格式
    // - 记录文件日志（始终启用）
    // - 根据 LOG_ENABLE_DATABASE 环境变量决定是否记录数据库日志
    AllExceptionsFilter,

    // 全局拦截器：统一响应格式和时区转换
    // - 自动将响应数据包装为统一格式
    // - 根据环境变量或请求头 X-Timezone 转换时间字段
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // 全局拦截器：API 日志记录
    // - 文件日志：始终启用（通过 LoggerMiddleware）
    // - 数据库日志：通过 LOG_ENABLE_DATABASE 环境变量控制（默认 false）
    //   或使用 @EnableDatabaseLog()/@DisableDatabaseLog() 装饰器精确控制
    // 详见：docs/modules/logging.md
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*'); // 应用到所有路由
  }
}
