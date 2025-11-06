import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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

// 通用模块
import { CommonModule } from './common/common.module';

// 业务模块
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PublicApiModule } from './modules/public-api/public-api.module';
import { HealthModule } from './modules/health/health.module';
import { LogsModule } from './modules/logs/logs.module';
import { MockModule } from './modules/mock/mock.module';

// 中间件
import { LoggerMiddleware } from './common/middlewares/logger.middleware';

// 拦截器和守卫
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
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
        '.env.local',
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
      expandVariables: true,
    }),

    // 限流模块 - 基于IP地址限流
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const throttleConfig = config.get('throttle');
        return [
          {
            name: 'short',
            ttl: throttleConfig?.short?.ttl || 1000,
            limit: throttleConfig?.short?.limit || 20,
          },
          {
            name: 'medium',
            ttl: throttleConfig?.medium?.ttl || 60000,
            limit: throttleConfig?.medium?.limit || 200,
          },
          {
            name: 'long',
            ttl: throttleConfig?.long?.ttl || 3600000,
            limit: throttleConfig?.long?.limit || 2000,
          },
        ];
      },
    }),

    // 定时任务模块
    ScheduleModule.forRoot(),

    // 健康检查模块
    TerminusModule,

    // 共享模块
    DatabaseModule,
    LoggerModule,
    CacheModule,
    RequestContextModule,
    CommonModule,

    // 业务模块
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    PublicApiModule,
    HealthModule,
    LogsModule,
    MockModule,
  ],
  providers: [
    // 全局异常过滤器
    // - 捕获所有未处理的异常并统一响应格式
    // - 记录文件日志（始终启用）
    // - 根据 LOG_ENABLE_DATABASE 环境变量决定是否记录数据库日志
    AllExceptionsFilter,

    // 全局守卫：限流保护（基于IP）
    // - 防止API被滥用，每个IP独立限流
    // - 三个级别：short(1秒20次)、medium(1分钟200次)、long(1小时2000次)
    // - 自动识别反向代理后的真实IP（X-Real-IP / X-Forwarded-For）
    // - 可通过 @SkipThrottle() 跳过特定路由
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },

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
