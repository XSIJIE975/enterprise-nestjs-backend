# 日志系统使用指南

> 完整的日志记录、请求链路追踪和日志查询指### 环境变量配置

```env
# .env 文件
LOG_LEVEL=info                    # 日志级别：debug, info, warn, error
LOG_DIR=logs                      # 日志文件目录
LOG_MAX_FILES=14d                 # 日志保留时间
LOG_MAX_SIZE=20m                  # 单个文件大小
LOG_ENABLE_CONSOLE=true           # 是否输出到控制台

# 数据库日志配置（通过 app.config.ts 配置）
LOG_ENABLE_DATABASE=false         # 是否全局启用数据库日志（默认 false）
LOG_DB_RETENTION_DAYS=30          # 数据库日志保留天数
```

> **配置说明**：数据库日志开关已统一到 `app.config.ts` 的 `log.enableDatabase` 属性，通过 `configService.get('app.log.enableDatabase')` 读取。

**各环境推荐配置：**

- **开发环境** (`LOG_ENABLE_DATABASE=true`) - 全局启用，方便调试
- **测试环境** (`LOG_ENABLE_DATABASE=true`) - 启用，用于集成测试验证
- **生产环境** (`LOG_ENABLE_DATABASE=false`) - 全局禁用，只对关键接口启用

本系统实现了完整的日志和请求链路跟踪系统,包括以下功能:

- **文件日志**: 使用 Winston 记录到 `logs/` 目录
- **数据库日志**: 将重要日志持久化到 MySQL 数据库
- **请求链路跟踪**: 使用 `requestId` 追踪单个请求的完整链路
- **结构化日志**: 所有日志都包含上下文信息

---

## 日志文件位置

### 文件日志

日志文件存储在项目根目录的 `logs/` 文件夹中:

```text
logs/
├── application-2025-10-05.log  # 所有日志(info、warn、error 等)
└── error-2025-10-05.log        # 仅错误日志
```

### 日志配置

- 日志文件按天轮转(`YYYY-MM-DD` 格式)
- 单个文件最大 20MB
- 保留最近 14 天的日志
- 可通过环境变量配置

### 环境变量配置

```env
# .env 文件
LOG_LEVEL=info                    # 日志级别: debug, info, warn, error
LOG_DIR=logs                      # 日志文件目录
LOG_MAX_FILES=14d                 # 日志保留时间
LOG_MAX_SIZE=20m                  # 单个文件大小
LOG_ENABLE_DATABASE=true          # 是否记录到数据库（读取路径：app.log.enableDatabase）
LOG_ENABLE_CONSOLE=true           # 是否输出到控制台
LOG_DB_RETENTION_DAYS=30          # 数据库日志保留天数
```

> **注意**：所有配置通过 `src/config/app.config.ts` 统一管理，使用 `configService.get('app.log.xxx')` 访问。

---

## 数据库日志

### 日志表结构

系统包含三个日志表:

#### 1. API 日志表 (`api_logs`)

记录所有 API 请求的详细信息:

- `requestId`: 请求唯一标识
- `userId`: 用户 ID(如果已登录)
- `method`: HTTP 方法
- `url`: 请求路径
- `params`: 请求参数(query + params)
- `body`: 请求体
- `response`: 响应数据
- `statusCode`: HTTP 状态码
- `duration`: 响应时间(毫秒)
- `ip`: 客户端 IP
- `userAgent`: 用户代理
- `error`: 错误信息(如果有)
- `createdAt`: 创建时间

#### 2. 错误日志表 (`error_logs`)

记录应用程序错误:

- `requestId`: 关联的请求 ID
- `errorCode`: 错误代码
- `message`: 错误消息
- `stack`: 堆栈跟踪
- `context`: 错误上下文
- `userId`: 用户 ID
- `ip`: 客户端 IP
- `userAgent`: 用户代理
- `createdAt`: 创建时间

#### 3. 审计日志表 (`audit_logs`)

记录重要的业务操作:

- `userId`: 操作用户
- `action`: 操作类型(create、update、delete 等)
- `resource`: 资源类型(user、role、permission 等)
- `resourceId`: 资源 ID
- `oldData`: 修改前的数据
- `newData`: 修改后的数据
- `ip`: 客户端 IP
- `userAgent`: 用户代理
- `createdAt`: 创建时间

---

## 请求链路跟踪 (Request ID)

### 工作原理

1. **生成 requestId**:
   - 每个请求进入时,`LoggerMiddleware` 自动生成唯一的 UUID
   - 如果客户端提供了 `X-Request-Id` 请求头,则使用客户端提供的值
   - requestId 会添加到响应头 `X-Request-Id` 中返回给客户端

2. **存储上下文**:
   - 使用 Node.js 的 `AsyncLocalStorage` 在整个请求链路中保持上下文
   - 上下文包括: requestId、userId、ip、userAgent 等信息

3. **自动关联**:
   - 所有日志自动包含当前请求的 requestId
   - 数据库日志通过 requestId 关联同一请求的所有操作
   - 可以通过 requestId 追踪完整的请求链路

### 如何使用 requestId

#### 在任何地方获取 requestId

```typescript
import { RequestContextService } from '@/shared/request-context/request-context.service';

// 获取当前请求的 requestId
const requestId = RequestContextService.getRequestId();

// 获取当前用户 ID
const userId = RequestContextService.getUserId();

// 获取客户端 IP
const ip = RequestContextService.getIp();
```

#### 在日志中使用

```typescript
import { LoggerService } from '@/shared/logger/logger.service';

constructor(private readonly logger: LoggerService) {}

someMethod() {
  // LoggerService 会自动包含 requestId
  this.logger.log('Processing order', 'OrderService');

  // 记录业务事件
  this.logger.logBusinessEvent({
    event: 'ORDER_CREATED',
    data: { orderId: 123 },
  });
}
```

#### 设置用户 ID 到上下文

在认证守卫或拦截器中设置:

```typescript
import { RequestContextService } from '@/shared/request-context/request-context.service';

// 用户登录后设置 userId
RequestContextService.setUserId(user.id);
```

---

## 日志记录 API

### 基本日志方法

```typescript
constructor(private readonly logger: LoggerService) {}

// 信息日志
this.logger.log('User logged in', 'AuthService');

// 错误日志
this.logger.error('Failed to process payment', error.stack, 'PaymentService');

// 警告日志
this.logger.warn('Low inventory alert', 'InventoryService');

// 调试日志
this.logger.debug('Processing step 1', 'WorkflowService');
```

### 业务日志方法

```typescript
// 记录错误到数据库
this.logger.logError({
  error: new Error('Payment failed'),
  context: 'PaymentService',
});

// 记录业务事件
this.logger.logBusinessEvent({
  event: 'USER_REGISTERED',
  data: { email: 'user@example.com' },
});

// 记录数据库操作
this.logger.logDatabaseOperation('SELECT', 'users', 45);

// 记录缓存操作
this.logger.logCacheOperation('get', 'user:123', true);

// 记录安全事件
this.logger.logSecurityEvent('Failed login attempt', 'medium', {
  ip: '192.168.1.1',
  attempts: 3,
});
```

### 审计日志

```typescript
import { LogsService } from '@/modules/logs/logs.service';

constructor(private readonly logsService: LogsService) {}

async updateUser(userId: number, newData: any) {
  const oldData = await this.getUserById(userId);

  // 更新用户
  const result = await this.prisma.user.update({
    where: { id: userId },
    data: newData,
  });

  // 记录审计日志
  await this.logsService.createAuditLog({
    userId: RequestContextService.getUserId(),
    action: 'UPDATE',
    resource: 'user',
    resourceId: userId.toString(),
    oldData,
    newData: result,
    ip: RequestContextService.getIp(),
  });

  return result;
}
```

---

## 数据库日志优化

### 问题说明

默认情况下，每个 API 请求都会记录到数据库中，这在高流量场景下可能导致：

- 数据量过大，占用大量存储空间
- 数据库写入压力增加
- 高频接口（如健康检查）产生大量无用日志

### 解决方案

系统提供了灵活的三层控制机制：

#### 1. 配置全局控制

通过 `app.config.ts` 中的 `log.enableDatabase` 控制全局开关：

```env
# 开发环境 - 全局启用，便于调试
LOG_ENABLE_DATABASE=true

# 生产环境 - 全局禁用，按需启用
LOG_ENABLE_DATABASE=false
```

代码中通过 `configService.get('app.log.enableDatabase')` 读取。

#### 2. 装饰器精确控制

使用装饰器对特定 Controller 或方法进行精确控制：

##### 启用数据库日志 - @EnableDatabaseLog()

```typescript
import { EnableDatabaseLog } from '@/common/decorators/database-log.decorator';

// 整个 Controller 启用
@Controller('orders')
@EnableDatabaseLog()
export class OrdersController {
  @Get()
  findAll() {} // ✅ 会记录到数据库

  @Post()
  create() {} // ✅ 会记录到数据库
}

// 只对特定方法启用
@Controller('payments')
export class PaymentsController {
  @Get()
  findAll() {} // ❌ 不记录

  @Post()
  @EnableDatabaseLog() // ✅ 只有这个方法记录到数据库
  create() {}
}
```

##### 禁用数据库日志 - @DisableDatabaseLog()

```typescript
import { DisableDatabaseLog } from '@/common/decorators/database-log.decorator';

// 整个 Controller 禁用（高频接口）
@Controller('health')
@DisableDatabaseLog()
export class HealthController {
  @Get()
  check() {} // ❌ 不会记录到数据库
}

// 在全局启用时排除特定方法
@Controller('users')
@EnableDatabaseLog()
export class UsersController {
  @Get()
  findAll() {} // ✅ 记录

  @Get('heartbeat')
  @DisableDatabaseLog() // ❌ 心跳接口不记录
  heartbeat() {}
}
```

#### 3. 优先级规则

数据库日志的判断优先级（从高到低）：

```text
方法装饰器 > 类装饰器 > 全局配置
```

**示例：**

```typescript
@Controller('example')
@EnableDatabaseLog() // 类级：启用
export class ExampleController {
  @Get('always-log')
  @EnableDatabaseLog() // 方法级：启用 → ✅ 记录
  method1() {}

  @Get('never-log')
  @DisableDatabaseLog() // 方法级：禁用 → ❌ 不记录（优先级最高）
  method2() {}

  @Get('follow-class')
  method3() {} // 跟随类级 → ✅ 记录
}
```

### 使用建议

#### 开发环境配置

```env
LOG_ENABLE_DATABASE=true
```

全局启用，然后排除高频接口：

```typescript
@Controller('health')
@DisableDatabaseLog() // 健康检查不记录
export class HealthController {}

@Controller('metrics')
@DisableDatabaseLog() // 监控指标不记录
export class MetricsController {}
```

#### 生产环境配置

```env
LOG_ENABLE_DATABASE=false
```

全局禁用，然后只启用关键接口：

```typescript
// 重要业务操作
@Controller('orders')
export class OrdersController {
  @Post()
  @EnableDatabaseLog()
  create() {}

  @Post(':id/cancel')
  @EnableDatabaseLog()
  cancel() {}
}

// 安全相关操作
@Controller('auth')
export class AuthController {
  @Post('login')
  @EnableDatabaseLog()
  login() {}

  @Post('change-password')
  @EnableDatabaseLog()
  changePassword() {}
}

// 权限变更操作
@Controller('users')
export class UsersController {
  @Post(':id/role')
  @EnableDatabaseLog()
  changeRole() {}
}
```

### 应该记录数据库日志的场景

✅ **推荐记录：**

- 重要业务操作（订单、支付、退款）
- 安全相关操作（登录、修改密码、权限变更）
- 数据删除操作
- 批量操作
- 出错率高的接口

### 不应该记录数据库日志的场景

❌ **不推荐记录：**

- 健康检查接口
- 心跳接口
- 实时统计接口
- 高频查询接口
- WebSocket 消息
- 静态资源请求

### 重要说明

1. **文件日志始终启用** - 不受此配置影响，所有请求都会记录到文件
2. **错误日志优先** - 即使禁用数据库日志，错误仍会记录（如果配置启用）
3. **异步记录** - 日志记录不会阻塞响应
4. **失败不影响业务** - 日志记录失败不会影响正常业务流程

---

## 查询日志 API

### API 端点

#### 1. 查询 API 日志

```http
GET /api/v1/logs/api?page=1&pageSize=20&method=GET&statusCode=200&userId=1
```

#### 2. 根据 requestId 查询详情

```http
GET /api/v1/logs/api/:requestId
```

#### 3. 查询错误日志

```http
GET /api/v1/logs/errors?page=1&pageSize=20&errorCode=INTERNAL_ERROR
```

#### 4. 查询审计日志

```http
GET /api/v1/logs/audit?page=1&pageSize=20&action=UPDATE&resource=user&userId=1
```

#### 5. 获取统计信息

```http
GET /api/v1/logs/statistics?startDate=2025-10-01&endDate=2025-10-05
```

### 使用示例

```typescript
// 前端查询日志
const response = await fetch('/api/v1/logs/api?page=1&pageSize=20');
const { data, total, page, pageSize } = await response.json();

// 根据 requestId 追踪完整链路
const requestId = 'xxx-xxx-xxx-xxx';
const detail = await fetch(`/api/v1/logs/api/${requestId}`);
```

---

## 日志清理

### 自动清理(定时任务)

可以创建定时任务自动清理旧日志:

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LogsService } from './logs.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LogCleanupTask {
  constructor(
    private readonly logsService: LogsService,
    private readonly configService: ConfigService,
  ) {}

  // 每天凌晨 2 点执行
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanOldLogs() {
    const retentionDays = this.configService.get(
      'app.log.databaseLogRetentionDays',
    );
    const result = await this.logsService.cleanOldLogs(retentionDays);

    console.log('Cleaned old logs:', result);
  }
}
```

### 手动清理

```typescript
// 清理 30 天前的日志
const result = await logsService.cleanOldLogs(30);
console.log(result);
// {
//   apiLogsDeleted: 1000,
//   errorLogsDeleted: 50,
//   auditLogsDeleted: 200
// }
```

---

## 性能优化

### 1. 数据库日志异步记录

API 日志记录到数据库是异步的,不会阻塞响应:

```typescript
// 在 LoggingInterceptor 中
this.logsService.createApiLog(data).catch(error => {
  // 记录失败不影响业务
  this.logger.error('Failed to save log', error.stack);
});
```

### 2. 敏感信息过滤

自动过滤敏感字段:

- password
- token
- secret
- apiKey
- creditCard

### 3. 响应数据截断

如果响应数据超过 10KB,自动截断并标记:

```json
{
  "_truncated": true,
  "_size": 50000,
  "_preview": "..."
}
```

### 4. 选择性启用数据库日志

如果不需要数据库日志,可以在特定控制器/路由上禁用。

---

## 故障排查

### 1. 根据 requestId 追踪问题

```sql
-- 查询特定请求的所有日志
SELECT * FROM api_logs WHERE requestId = 'xxx-xxx-xxx-xxx';
SELECT * FROM error_logs WHERE requestId = 'xxx-xxx-xxx-xxx';
```

### 2. 查询特定用户的操作

```sql
-- 查询用户的所有操作
SELECT * FROM api_logs WHERE userId = 123 ORDER BY createdAt DESC;
SELECT * FROM audit_logs WHERE userId = 123 ORDER BY createdAt DESC;
```

### 3. 分析错误趋势

```sql
-- 统计错误类型
SELECT errorCode, COUNT(*) as count
FROM error_logs
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY errorCode
ORDER BY count DESC;
```

### 4. 性能分析

```sql
-- 查找慢请求
SELECT method, url, AVG(duration) as avg_duration, COUNT(*) as count
FROM api_logs
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY method, url
HAVING avg_duration > 1000
ORDER BY avg_duration DESC;
```

---

## 最佳实践

1. **使用结构化日志**: 使用 LoggerService 而不是 console.log
2. **包含上下文**: 总是提供日志的 context 参数
3. **合理的日志级别**:
   - `debug`: 调试信息
   - `info`: 正常操作
   - `warn`: 警告但不影响功能
   - `error`: 错误需要关注
4. **审计重要操作**: 所有 CUD 操作都应记录审计日志
5. **定期清理**: 设置定时任务清理旧日志
6. **监控日志大小**: 定期检查 logs 目录和数据库表的大小

---

## 示例场景

### 场景 1: 用户注册流程追踪

```typescript
// 1. 用户注册请求到达
// → LoggerMiddleware 生成 requestId: abc-123

// 2. 在 AuthService 中
this.logger.log('Starting user registration', 'AuthService');

// 3. 在 UsersService 中
this.logger.log('Creating user in database', 'UsersService');

// 4. 记录审计日志
await this.logsService.createAuditLog({
  action: 'CREATE',
  resource: 'user',
  resourceId: user.id.toString(),
  newData: user,
});

// 5. 所有这些日志都自动包含 requestId: abc-123
// 可以通过这个 requestId 追踪整个注册流程
```

### 场景 2: 错误追踪

```typescript
try {
  await this.paymentService.processPayment(order);
} catch (error) {
  // 记录错误日志(自动包含 requestId)
  this.logger.logError({
    error,
    context: 'OrderService.processPayment',
  });

  throw error;
}

// 后续通过 requestId 可以:
// 1. 查看完整的请求参数
// 2. 追踪调用链
// 3. 分析错误原因
```

---

## 总结

通过这个完整的日志系统,你可以:

1. ✅ 在文件中记录结构化日志(`logs/` 目录)
2. ✅ 在数据库中持久化重要日志
3. ✅ 使用 requestId 追踪完整的请求链路
4. ✅ 在任何地方自动获取 requestId 和 userId
5. ✅ 查询和分析历史日志
6. ✅ 审计重要的业务操作
7. ✅ 快速定位和解决问题

---

## 下一步

- [请求生命周期详解](../architecture/request-lifecycle.md)
- [开发工作流程](../guides/development-workflow.md)

---

**维护者**: XSIJIE
**最后更新**: 2025-10-10
