import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import * as express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import { LoggerService } from './shared/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const loggerService = app.get(LoggerService);

  // 使用自定义日志服务
  app.useLogger(loggerService);

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
    origin: configService.get('ALLOWED_ORIGINS')?.split(',') || [
      'http://localhost:3000',
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
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }),
  );

  // 全局过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // 全局拦截器
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger文档配置
  if (configService.get('NODE_ENV') !== 'production') {
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

  const port =
    configService.get('app.port') || configService.get('PORT') || 8000;
  const host =
    configService.get('app.host') || configService.get('HOST') || 'localhost';

  await app.listen(port, host);

  loggerService.log(`🚀 Application is running on: http://${host}:${port}`);
  loggerService.log(`📚 API Documentation: http://${host}:${port}/api/docs`);
}

bootstrap().catch(error => {
  console.error('❌ Error starting the application:', error);
  process.exit(1);
});
