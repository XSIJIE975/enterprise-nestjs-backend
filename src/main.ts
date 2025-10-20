import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import * as express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggerService } from './shared/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const loggerService = app.get(LoggerService);

  // 使用自定义日志服务
  app.useLogger(loggerService);

  // 信任代理，获取真实IP（用于限流和日志）
  // true: 信任所有代理（不安全，仅开发环境）
  // false: 不信任代理
  // 1: 信任第一层代理（推荐：Nginx/负载均衡器）
  // 'loopback': 信任本地回环地址（127.0.0.1, ::1）
  // '192.168.0.0/16': 信任特定网段的代理
  app.set(
    'trust proxy',
    configService.get('app.env') === 'production' ? 1 : true,
  );

  // 配置静态文件服务 - 托管 public 目录
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/', // 直接从根路径访问
  });

  // 全局前缀，排除根路径和API信息路径
  app.setGlobalPrefix('api/v1', {
    exclude: [
      '', // 根路径 /
      'api', // API信息路径 /api
      'api/docs', // Swagger文档路径
    ],
  });

  // 安全中间件
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS配置
  app.enableCors({
    origin: configService.get('app.allowedOrigins')?.split(',') || [
      'http://localhost:8000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // 响应压缩
  app.use(compression());

  // 请求大小限制
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 全局管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: configService.get('app.env') === 'production',
    }),
  );

  // 全局过滤器（通过依赖注入获取实例）
  const allExceptionsFilter = app.get(AllExceptionsFilter);
  app.useGlobalFilters(allExceptionsFilter);

  // 注意：全局拦截器已在 AppModule 中通过 APP_INTERCEPTOR 注册
  // - ResponseInterceptor: 统一响应格式和时区转换
  // - LoggingInterceptor: API 日志记录

  // Swagger文档配置
  if (configService.get('app.env') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Enterprise NestJS API')
      .setDescription('企业级NestJS后端API文档')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Auth', '认证相关接口')
      .addTag('Users', '用户管理')
      .addTag('Admin', '管理后台')
      .addTag('Public', '公开接口')
      .addTag('Health', '健康检查')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = configService.get('app.port') || 8000;
  const host = configService.get('app.host') || 'localhost';

  await app.listen(port, host);

  loggerService.log(`🚀 Application is running on: http://${host}:${port}`);
  loggerService.log(`📚 API Documentation: http://${host}:${port}/api/docs`);
}

bootstrap().catch(error => {
  console.error('❌ Error starting the application:', error);
  process.exit(1);
});
