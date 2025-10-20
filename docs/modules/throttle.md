# 限流策略文档

> API 请求速率限制和保护机制

## 概述

本系统使用 `@nestjs/throttler` 实现了多级限流策略，防止 API 被滥用，保护服务器资源。

## 限流配置

### 三级限流策略

系统配置了三个级别的限流：

| 级别              | 时间窗口 | 请求限制 | 说明               |
| ----------------- | -------- | -------- | ------------------ |
| **短时 (short)**  | 1 秒     | 10 次    | 防止瞬间大量请求   |
| **中时 (medium)** | 1 分钟   | 100 次   | 正常业务频率控制   |
| **长时 (long)**   | 1 小时   | 1000 次  | 防止长时间持续攻击 |

### 环境变量配置

在 `.env` 文件中配置：

```env
# 短时限流（秒级）
THROTTLE_SHORT_TTL=1000        # 1秒（毫秒）
THROTTLE_SHORT_LIMIT=10        # 10次

# 中时限流（分钟级）
THROTTLE_MEDIUM_TTL=60000      # 1分钟（毫秒）
THROTTLE_MEDIUM_LIMIT=100      # 100次

# 长时限流（小时级）
THROTTLE_LONG_TTL=3600000      # 1小时（毫秒）
THROTTLE_LONG_LIMIT=1000       # 1000次
```

### 配置文件

配置位于 `src/config/throttle.config.ts`：

```typescript
import { registerAs } from '@nestjs/config';

export const throttleConfig = registerAs('throttle', () => ({
  // 短时限流（秒级）
  short: {
    ttl: parseInt(process.env.THROTTLE_SHORT_TTL, 10) || 1000,
    limit: parseInt(process.env.THROTTLE_SHORT_LIMIT, 10) || 10,
  },

  // 中时限流（分钟级）
  medium: {
    ttl: parseInt(process.env.THROTTLE_MEDIUM_TTL, 10) || 60000,
    limit: parseInt(process.env.THROTTLE_MEDIUM_LIMIT, 10) || 100,
  },

  // 长时限流（小时级）
  long: {
    ttl: parseInt(process.env.THROTTLE_LONG_TTL, 10) || 3600000,
    limit: parseInt(process.env.THROTTLE_LONG_LIMIT, 10) || 1000,
  },
}));
```

## 工作原理

### 全局守卫

在 `src/app.module.ts` 中注册全局守卫：

```typescript
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

### 请求追踪

限流守卫会根据以下信息追踪请求：

1. **IP 地址** - 默认追踪方式
2. **用户 ID** - 可自定义
3. **API 路由** - 每个路由独立计数

### 响应头

当请求触发限流时，返回以下响应头：

```
X-RateLimit-Limit: 100           # 限制次数
X-RateLimit-Remaining: 0         # 剩余次数
X-RateLimit-Reset: 1634567890    # 重置时间（Unix 时间戳）
Retry-After: 60                   # 建议重试时间（秒）
```

## 使用方法

### 1. 全局限流（默认）

所有路由自动应用限流：

```typescript
@Controller('users')
export class UsersController {
  @Get() // 自动应用限流
  findAll() {
    return 'This action returns all users';
  }
}
```

### 2. 跳过限流

某些路由不需要限流：

```typescript
import { SkipThrottle } from '@nestjs/throttler';

@Controller('public')
export class PublicController {
  @SkipThrottle() // 跳过限流
  @Get('info')
  getInfo() {
    return 'Public information';
  }
}
```

### 3. 自定义限流

为特定路由设置不同的限流规则：

```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  // 登录接口：1分钟内最多5次
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login() {
    return 'Login endpoint';
  }

  // 注册接口：1小时内最多3次
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @Post('register')
  register() {
    return 'Register endpoint';
  }
}
```

### 4. 多级限流

同时应用多个限流规则：

```typescript
@Throttle([
  { name: 'short', limit: 5, ttl: 1000 },    // 1秒5次
  { name: 'medium', limit: 20, ttl: 60000 }, // 1分钟20次
])
@Post('sensitive')
sensitiveAction() {
  return 'Sensitive action';
}
```

## 限流场景

### 场景 1: 认证接口

```typescript
@Controller('auth')
export class AuthController {
  // 登录：防止暴力破解
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 1分钟5次
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // 发送验证码：防止短信轰炸
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 1小时3次
  @Post('send-code')
  async sendCode(@Body() dto: SendCodeDto) {
    return this.authService.sendCode(dto);
  }
}
```

### 场景 2: 数据密集型接口

```typescript
@Controller('reports')
export class ReportsController {
  // 导出数据：限制频率
  @Throttle({ default: { limit: 2, ttl: 3600000 } }) // 1小时2次
  @Get('export')
  async exportData() {
    return this.reportsService.exportData();
  }
}
```

### 场景 3: 公开接口

```typescript
@Controller('public')
export class PublicController {
  // 健康检查：不限流
  @SkipThrottle()
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  // 公开API：温和限流
  @Throttle({ default: { limit: 1000, ttl: 3600000 } }) // 1小时1000次
  @Get('data')
  getData() {
    return this.publicService.getData();
  }
}
```

## 错误处理

### 429 错误响应

当请求被限流时，返回 `429 Too Many Requests`：

```json
{
  "success": false,
  "data": null,
  "message": "请求过于频繁，请稍后再试",
  "errorCode": "R10000",
  "timestamp": "2025-10-20T10:30:00+08:00",
  "requestId": "req-abc123"
}
```

### 客户端处理

客户端应该处理 429 错误：

```typescript
async function makeRequest() {
  try {
    const response = await fetch('/api/v1/users');

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      console.warn(`Rate limited. Retry after ${retryAfter}s`);

      // 等待后重试
      await new Promise(resolve =>
        setTimeout(resolve, parseInt(retryAfter) * 1000),
      );

      return makeRequest(); // 重试
    }

    return await response.json();
  } catch (error) {
    console.error('Request failed:', error);
  }
}
```

## 高级配置

### 自定义限流追踪器

基于用户 ID 限流：

```typescript
import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // 使用用户ID作为追踪标识
    return req.user?.id || req.ip;
  }
}
```

### 存储配置

默认使用内存存储，生产环境建议使用 Redis：

```typescript
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'throttler-storage-redis';

ThrottlerModule.forRoot({
  throttlers: [{ ttl: 60, limit: 10 }],
  storage: new ThrottlerStorageRedisService({
    host: 'localhost',
    port: 6379,
  }),
});
```

## 监控与日志

### 限流日志

限流事件会自动记录到日志：

```
[WARN] Rate limit exceeded for IP 192.168.1.100 on /api/v1/users
[INFO] Rate limit reset for IP 192.168.1.100
```

### Prometheus 指标（可选）

可以导出限流指标用于监控：

```typescript
// 限流计数器
throttle_requests_total{status="allowed"}
throttle_requests_total{status="throttled"}

// 限流延迟
throttle_duration_seconds
```

## 最佳实践

### 1. 合理设置限制

- **公开API**: 较宽松（1000次/小时）
- **认证API**: 严格（5次/分钟）
- **敏感操作**: 极严格（3次/小时）

### 2. 分级保护

```typescript
// 全局默认限流
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 10 },
  { name: 'medium', ttl: 60000, limit: 100 },
])

// 特定路由加强
@Throttle({ default: { limit: 3, ttl: 60000 } })
@Post('login')
```

### 3. 友好提示

在响应中包含清晰的错误信息：

```json
{
  "message": "请求过于频繁，请1分钟后再试",
  "retryAfter": 60
}
```

### 4. 监控告警

- 监控限流触发频率
- 异常IP地址告警
- 自动封禁恶意请求

## 常见问题

### Q1: 如何为不同用户设置不同限流？

使用自定义守卫：

```typescript
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getLimit(context: ExecutionContext): Promise<number> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // VIP用户更高限制
    if (user?.isVip) {
      return 1000;
    }

    return 100; // 普通用户
  }
}
```

### Q2: 限流数据存储在哪里？

- **开发环境**: 内存存储（重启丢失）
- **生产环境**: 建议使用 Redis（持久化）

### Q3: 如何临时调整限流？

修改 `.env` 文件并重启应用：

```env
THROTTLE_SHORT_LIMIT=20  # 临时放宽到20次
```

### Q4: 能否豁免某些IP？

可以通过自定义守卫实现：

```typescript
protected async handleRequest(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest();

  // 白名单IP
  const whitelistIPs = ['192.168.1.100', '10.0.0.1'];
  if (whitelistIPs.includes(request.ip)) {
    return true;
  }

  return super.handleRequest(context);
}
```

## 相关资源

- [NestJS Throttler 官方文档](https://docs.nestjs.com/security/rate-limiting)
- [限流算法详解](https://en.wikipedia.org/wiki/Rate_limiting)
- [错误码说明](../architecture/error-codes.md)

---

**更新日期**: 2025-10-20  
**维护者**: XSIJIE
