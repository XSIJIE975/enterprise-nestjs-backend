import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import * as express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import * as basicAuth from 'express-basic-auth';
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
  app.setGlobalPrefix(`${configService.get('app.apiPrefix')}`, {
    exclude: [
      '', // 根路径 /
      'api', // API信息路径 /api
      'api/docs', // Swagger文档路径
    ],
  });

  // Helmet：添加常用安全头（CSP、HSTS、Referrer-Policy、Frameguard 等）
  app.use(
    helmet({
      // 内容安全策略（保守默认，必要时可改为 nonce/hash 策略）
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      // 保持原有设置
      crossOriginEmbedderPolicy: false,
      // HSTS：仅在生产并且启用了 HTTPS 时生效（请确保在生产环境下启用）
      hsts: {
        maxAge: 63072000, // 2 years in seconds
        includeSubDomains: true,
        preload: true,
      },
      // 禁止被嵌入到其他站点（防止 clickjacking）。如需 iframe 嵌套改为 'sameorigin'
      frameguard: {
        action: 'deny',
      },
      // 严格的 Referrer-Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      // 其余 Helmet 默认保护（X-Content-Type-Options, X-DNS-Prefetch-Control 等）将保持启用
    }),
  );

  // CORS 配置：解析 ALLOWED_ORIGINS 并做基本校验
  const allowedOriginsRaw = configService.get<string>('app.allowedOrigins');
  const allowedOrigins = allowedOriginsRaw
    ? allowedOriginsRaw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : ['http://localhost:8000'];

  // 校验：空值记录警告；若包含 '*'，非生产环境警告，生产环境拒绝启动（避免凭证泄露风险）
  const env = configService.get('app.env');
  if (!allowedOrigins || allowedOrigins.length === 0) {
    loggerService.warn(
      'ALLOWED_ORIGINS is empty — CORS will be restrictive. Please configure ALLOWED_ORIGINS in your environment variables.',
    );
  }

  if (allowedOrigins.includes('*')) {
    const msg =
      'ALLOWED_ORIGINS contains "*" — allowing all origins with credentials is insecure.';
    if (env === 'production') {
      loggerService.error(
        msg + ' Refusing to start in production with credentials allowed.',
      );
      console.error(msg);
      process.exit(1);
    } else {
      loggerService.warn(
        msg +
          ' This is allowed in non-production environments for convenience.',
      );
    }
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    // 允许前端常用自定义 header（含 CSRF header）
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-XSRF-TOKEN',
      'X-CSRF-Token',
    ],
  });

  // 响应压缩
  app.use(compression());

  // ==================== 请求体大小限制 ====================
  // 注意：这些限制只针对 JSON、表单等非文件上传的请求
  // 文件上传使用 multer，大小限制在 upload.config.ts 中配置

  /**
   * JSON 请求体大小限制
   * Content-Type: application/json
   * 适用于: API 请求、前端 JSON 提交
   */
  app.use(
    express.json({
      limit: configService.get<string>('app.bodyLimit.json') || '10mb',
    }),
  );

  /**
   * URL 编码表单大小限制
   * Content-Type: application/x-www-form-urlencoded
   * 适用于: 传统 HTML 表单提交
   */
  app.use(
    express.urlencoded({
      extended: true,
      limit: configService.get<string>('app.bodyLimit.urlencoded') || '10mb',
    }),
  );

  /**
   * 原始请求体大小限制
   * Content-Type: application/octet-stream
   * 适用于: 二进制数据传输（非文件上传）
   */
  app.use(
    express.raw({
      limit: configService.get<string>('app.bodyLimit.raw') || '10mb',
    }),
  );

  /**
   * 文本请求体大小限制
   * Content-Type: text/plain
   * 适用于: 纯文本数据传输
   */
  app.use(
    express.text({
      limit: configService.get<string>('app.bodyLimit.text') || '1mb',
    }),
  );

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
  const swaggerEnabled = configService.get('app.swagger.enabled');
  if (swaggerEnabled && configService.get('app.env') !== 'production') {
    // Swagger Basic Auth 认证
    const swaggerAuthEnabled = configService.get('app.swagger.authEnabled');
    if (swaggerAuthEnabled) {
      const swaggerUsername = configService.get('app.swagger.username');
      const swaggerPassword = configService.get('app.swagger.password');

      app.use(
        ['/api/docs', '/api/docs-json', '/api/docs-yaml'],
        basicAuth({
          challenge: true,
          users: { [swaggerUsername]: swaggerPassword },
          realm: 'Swagger Documentation',
        }),
      );
      loggerService.log(
        '🔒 Swagger documentation is protected with Basic Auth',
      );
    }

    const config = new DocumentBuilder()
      .setTitle(`${configService.get('app.name')} API`)
      .setDescription(`${configService.get('app.name')} 接口文档`)
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
      .addTag('Health', '健康检查')
      .addTag('Auth', '认证管理')
      .addTag('Users', '用户管理')
      .addTag('Admin', '管理后台')
      .addTag('Public', '公开接口')
      .addTag('Permissions', '权限管理')
      .addTag('Logs', '日志管理')
      .addTag('Roles', '角色管理')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      jsonDocumentUrl: 'api/docs-json',
      yamlDocumentUrl: 'api/docs-yaml',
    });
  }

  const port = configService.get('app.port') || 8000;
  const host = configService.get('app.host') || 'localhost';

  await app.listen(port, host);

  loggerService.log(`🚀 Application is running on: http://${host}:${port}`);
  loggerService.log(`📚 API Documentation: http://${host}:${port}/api/docs`);
  loggerService.log(`📄 OpenAPI JSON: http://${host}:${port}/api/docs-json`);
  loggerService.log(`📄 OpenAPI YAML: http://${host}:${port}/api/docs-yaml`);
}

bootstrap().catch(error => {
  console.error('❌ Error starting the application:', error);
  process.exit(1);
});
