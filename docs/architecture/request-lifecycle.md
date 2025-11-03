# 请求生命周期详解

> 📌 **维护者**: XSIJIE | **最后更新**: 2025-11-03

> 深入理解 NestJS 应用中的请求处理全流程

## 概述

一个 HTTP 请求从进入 NestJS 应用到返回响应,会经过多个层级的处理。本文档详细说明每个阶段的职责和执行顺序。

---

## 完整的请求生命周期

```text
客户端请求
    │
    ↓
【1. 中间件层 Middleware】
    │
    ├─→ LoggerMiddleware (日志中间件)
    │   ├─ 生成 requestId (UUID)
    │   ├─ 创建 AsyncLocalStorage 上下文
    │   ├─ 记录请求开始日志
    │   └─ 将 requestId 添加到响应头
    │
    ├─→ CORS (跨域中间件)
    │   └─ 处理跨域请求
    │
    └─→ Compression (压缩中间件)
        └─ 压缩响应数据
    │
    ↓
【2. 守卫层 Guards】
    │
    ├─→ ThrottlerGuard (限流守卫)
    │   └─ 检查请求频率
    │
    ├─→ JwtAuthGuard (JWT 认证守卫)
    │   ├─ 验证 JWT Token
    │   ├─ 提取用户信息
    │   └─ 设置 userId 到上下文
    │
    └─→ RolesGuard (角色权限守卫)
        └─ 检查用户权限
    │
    ↓
【3. 拦截器层 Interceptors - Before】
    │
    ├─→ LoggingInterceptor (日志拦截器)
    │   └─ 记录请求参数
    │
    └─→ CacheInterceptor (缓存拦截器)
        └─ 检查缓存
    │
    ↓
【4. 管道层 Pipes】
    │
    └─→ ValidationPipe (验证管道)
        ├─ 验证 DTO
        ├─ 数据转换
        └─ 参数校验
    │
    ↓
【5. 控制器层 Controller】
    │
    └─→ 路由处理函数
        └─ 调用服务层
    │
    ↓
【6. 服务层 Service】
    │
    └─→ 业务逻辑处理
        ├─ 数据库操作
        ├─ 缓存操作
        └─ 业务逻辑
    │
    ↓
【7. 拦截器层 Interceptors - After】
    │
    ├─→ LoggingInterceptor (日志拦截器)
    │   ├─ 记录响应数据
    │   ├─ 计算响应时间
    │   └─ 保存日志到数据库
    │
    └─→ ResponseInterceptor (响应拦截器)
        ├─ 格式化响应数据
        ├─ 添加 requestId
        └─ 统一响应格式
    │
    ↓
【8. 异常过滤器 Exception Filters】
    │
    └─→ HttpExceptionFilter (全局异常过滤器)
        ├─ 捕获所有异常
        ├─ 记录错误日志
        └─ 返回错误响应
    │
    ↓
客户端收到响应
```

---

## 各层级详解

### 1. 中间件层 (Middleware)

**执行时机**: 最早执行,在所有其他组件之前

**核心职责**:

- 请求预处理
- 生成请求标识 (requestId)
- 初始化请求上下文
- 处理跨域
- 请求日志记录

**代码位置**: `src/common/middlewares/logger.middleware.ts`

**关键实现**:

```typescript
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    // 使用 AsyncLocalStorage 创建上下文
    this.requestContextService.run(
      {
        requestId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        startTime: Date.now(),
      },
      () => {
        res.setHeader('X-Request-Id', requestId);
        next();
      },
    );
  }
}
```

**注册方式**:

```typescript
// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
```

---

### 2. 守卫层 (Guards)

**执行时机**: 中间件之后,拦截器之前

**核心职责**:

- 认证验证
- 权限检查
- 访问控制

**执行顺序**: 全局守卫 → 控制器守卫 → 路由守卫

#### JwtAuthGuard - JWT 认证

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // 1. 提取 JWT Token
    // 2. 验证 Token 有效性
    // 3. 解析用户信息
    // 4. 设置到请求对象
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw new UnauthorizedException('Invalid token');
    }
    // 设置 userId 到上下文
    RequestContextService.setUserId(user.id);
    return user;
  }
}
```

#### RolesGuard - RBAC 权限

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) {
      return true; // 无权限要求
    }

    const user = context.switchToHttp().getRequest().user;
    return user.roles.some(role => requiredRoles.includes(role));
  }
}
```

**使用示例**:

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Post('users')
  @Roles('admin', 'superadmin')
  createUser(@Body() dto: CreateUserDto) {
    // 只有 admin 或 superadmin 角色才能访问
  }
}
```

---

### 3. 拦截器层 (Interceptors)

**执行时机**: 守卫之后,控制器处理前后

**核心职责**:

- 响应格式化
- 日志记录
- 缓存处理
- 响应转换

**特点**: 拦截器有两个执行时机(before/after)

#### LoggingInterceptor - 日志记录

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // Before: 记录请求信息
    const logData = {
      method: request.method,
      url: request.url,
      body: request.body,
    };

    return next.handle().pipe(
      tap(response => {
        // After: 记录响应信息
        const duration = Date.now() - startTime;

        // 异步保存到数据库(不阻塞响应)
        this.logsService.createApiLog({
          ...logData,
          response,
          duration,
          statusCode: 200,
          requestId: RequestContextService.getRequestId(),
        });
      }),
      catchError(error => {
        // 发生错误时记录
        const duration = Date.now() - startTime;

        this.logsService.createApiLog({
          ...logData,
          error: error.message,
          duration,
          statusCode: error.status || 500,
        });

        throw error;
      }),
    );
  }
}
```

**注册为全局拦截器**:

```typescript
// app.module.ts
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: LoggingInterceptor,
  },
];
```

#### ResponseInterceptor - 响应格式化

```typescript
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
        requestId: RequestContextService.getRequestId(),
      })),
    );
  }
}
```

**统一响应格式**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe"
  },
  "timestamp": "2025-10-05T10:30:00.000Z",
  "requestId": "abc-123-456"
}
```

---

### 4. 管道层 (Pipes)

**执行时机**: 拦截器之后,控制器方法执行前

**核心职责**:

- 数据验证
- 数据转换
- 参数解析

**内置管道**:

- `ValidationPipe`: DTO 验证
- `ParseIntPipe`: 字符串转整数
- `ParseBoolPipe`: 字符串转布尔值

**使用示例**:

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  // id 自动转换为 number 类型
}

@Post()
create(@Body() dto: CreateUserDto) {
  // dto 自动验证
}
```

**DTO 验证**:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

---

### 5. 控制器层 (Controller)

**执行时机**: 管道验证通过后

**核心职责**:

- 路由处理
- 调用服务层
- 返回响应

**代码示例**:

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() query: QueryDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
```

---

### 6. 服务层 (Service)

**核心职责**:

- 业务逻辑处理
- 数据库操作
- 调用其他服务

**代码示例**:

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreateUserDto) {
    this.logger.log('Creating user', 'UsersService');

    // 业务逻辑
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 数据库操作
    const user = await this.prisma.user.create({
      data: {
        ...dto,
        password: hashedPassword,
      },
    });

    this.logger.logBusinessEvent({
      event: 'USER_CREATED',
      data: { userId: user.id },
    });

    return user;
  }
}
```

---

### 7. 异常过滤器 (Exception Filters)

**执行时机**: 捕获整个链路的异常

**核心职责**:

- 统一错误处理
- 错误日志记录
- 错误响应格式化

**代码实现**:

```typescript
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // 记录错误日志
    this.logger.error(message, exception.stack);

    // 返回统一错误格式
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      requestId: RequestContextService.getRequestId(),
    });
  }
}
```

---

## RequestId 链路追踪流程

### 完整流程图

```text
1. 【LoggerMiddleware】
   ↓ 生成或从请求头获取 requestId
   ↓ 创建 AsyncLocalStorage 上下文
   ↓
   {
     requestId: "abc-123-456",
     userId: undefined,  // 此时还未认证
     ip: "192.168.1.1",
     startTime: 1234567890
   }

2. 【JwtAuthGuard】
   ↓ 验证 JWT，提取用户信息
   ↓ 设置 userId 到上下文
   ↓
   RequestContextService.setUserId(user.id)
   ↓
   {
     requestId: "abc-123-456",
     userId: 1001,  // 已设置
     ip: "192.168.1.1",
     startTime: 1234567890
   }

3. 【在任何地方】
   ↓ 获取上下文信息
   ↓
   const requestId = RequestContextService.getRequestId();
   const userId = RequestContextService.getUserId();

   // LoggerService 自动包含这些信息
   this.logger.log('Processing order', 'OrderService');

4. 【LoggingInterceptor】
   ↓ 请求完成后
   ↓ 从上下文获取所有信息
   ↓ 保存到数据库
   ↓
   INSERT INTO api_logs (
     requestId: "abc-123-456",
     userId: 1001,
     method: "POST",
     url: "/api/v1/orders",
     duration: 150,
     ...
   )
```

### 关键实现

#### AsyncLocalStorage 上下文

```typescript
// request-context.service.ts
export class RequestContextService {
  private static asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

  static run(context: RequestContext, callback: () => void) {
    this.asyncLocalStorage.run(context, callback);
  }

  static getRequestId(): string | undefined {
    return this.asyncLocalStorage.getStore()?.requestId;
  }

  static getUserId(): number | undefined {
    return this.asyncLocalStorage.getStore()?.userId;
  }

  static setUserId(userId: number): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.userId = userId;
    }
  }
}
```

#### 自动包含上下文的日志

```typescript
// logger.service.ts
export class LoggerService {
  log(message: string, context?: string) {
    const logContext = this.getLogContext();

    this.logger.info({
      message,
      context,
      ...logContext, // 自动包含 requestId, userId
    });
  }

  private getLogContext() {
    return {
      requestId: RequestContextService.getRequestId(),
      userId: RequestContextService.getUserId(),
    };
  }
}
```

---

## 实际请求示例

### 用户登录请求

**请求**:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**处理流程**:

```text
1. LoggerMiddleware
   - 生成 requestId: "req-001"
   - 创建上下文
   - 日志: "→ POST /api/v1/auth/login"

2. CORS 中间件
   - 检查来源是否允许
   - 添加 CORS 头

3. ThrottlerGuard
   - 检查该 IP 的请求频率
   - 通过

4. ValidationPipe
   - 验证 DTO
   - email: ✓ 有效的邮箱格式
   - password: ✓ 长度符合要求

5. AuthController.login()
   - 调用 AuthService.validateUser()

6. AuthService.validateUser()
   - 查询数据库获取用户
   - 验证密码 (bcrypt.compare)
   - 生成 JWT Token
   - 创建会话记录

7. ResponseInterceptor
   - 格式化响应:
   {
     "success": true,
     "data": {
       "accessToken": "eyJhbG...",
       "refreshToken": "eyJhbG...",
       "user": { "id": 1, "email": "..." }
     },
     "timestamp": "2025-10-05T10:30:00.000Z",
     "requestId": "req-001"
   }

8. LoggingInterceptor
   - 异步保存日志到数据库:
   {
     requestId: "req-001",
     method: "POST",
     url: "/api/v1/auth/login",
     statusCode: 200,
     duration: 120,
     userId: 1
   }
```

---

## 总结

### 执行顺序

```text
请求进入
  → Middleware (日志, CORS)
  → Guards (认证, 权限)
  → Interceptors (Before)
  → Pipes (验证, 转换)
  → Controller
  → Service
  → Interceptors (After)
  → Exception Filters (如果有错误)
响应返回
```

### 关键点

1. **中间件最早执行**: 负责生成 requestId 和初始化上下文
2. **守卫控制访问**: 认证和权限检查
3. **拦截器处理前后**: 日志记录、响应格式化
4. **管道验证数据**: 确保数据格式正确
5. **服务层处理业务**: 包含核心业务逻辑
6. **异常过滤器兜底**: 统一错误处理

---

## 下一步

- [日志系统使用指南](../modules/logging.md)
- [认证授权机制](../modules/auth.md)
- [架构概览](./overview.md)

---
