# 时区转换完整实现指南

> 📌 **维护者**: XSIJIE | **最后更新**: 2025-11-03

## 📋 目录

- [概述](#概述)
- [问题背景](#问题背景)
- [架构设计](#架构设计)
- [功能特性](#功能特性)
- [配置指南](#配置指南)
- [API 使用](#api-使用)
- [实现细节](#实现细节)
- [前端集成](#前端集成)
- [测试用例](#测试用例)
- [常见问题](#常见问题)
- [最佳实践](#最佳实践)
- [参考资源](#参考资源)

---

## 概述

本系统实现了完整的**多时区支持**解决方案，包括：

| 功能           | 说明                                    |
| -------------- | --------------------------------------- |
| **数据库存储** | 所有时间以 UTC 格式存储                 |
| **查询转换**   | 将本地时区日期转换为 UTC 进行数据库查询 |
| **响应转换**   | 将 UTC 时间自动转换为目标时区显示       |
| **DST 处理**   | 自动处理夏令时边界情况                  |
| **时区验证**   | 内置 IANA 时区标准验证                  |

---

## 问题背景

### ❌ 问题描述

在国际化应用中，如果不正确处理时区，会导致严重的数据查询错误。

**实际案例**：

用户在北京时间（UTC+8）配置，查询 `2025-11-01` 的日志

| 场景        | 理解方式     | 实际查询范围                                | 问题                |
| ----------- | ------------ | ------------------------------------------- | ------------------- |
| ❌ 错误方案 | 直接转为 UTC | 2025-11-01T00:00:00Z ~ 2025-11-01T23:59:59Z | **时间错位 8 小时** |
| ✅ 正确方案 | 北京时间理解 | 2025-10-31T16:00:00Z ~ 2025-11-01T15:59:59Z | **精确查询**        |

### 🎯 解决方案

```
┌─────────────────────────────────────────────────────────────┐
│ 用户输入（本地时区）→ 转换为 UTC → 数据库查询 → 结果转回本地时区  │
├─────────────────────────────────────────────────────────────┤
│ 用户: 2025-11-01        转换         2025-10-31T16:00:00Z   │
│ (Asia/Shanghai)    →  (UTC)     →    到                     │
│                                   2025-11-01T15:59:59Z      │
└─────────────────────────────────────────────────────────────┘
```

---

## 架构设计

### 核心组件

```
┌──────────────────┐
│   客户端请求      │
│  (x-timezone)    │
└────────┬─────────┘
         │
         ↓
┌──────────────────────────────┐
│    Controller 层             │
│ - 提取 x-timezone 请求头     │
│ - 传递给 Service           │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│    Service 层                    │
│ - 时区优先级判断                 │
│ - 日期范围转换（本地→UTC）        │
│ - 调用 Repository 查询          │
└────────┬────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│    数据库                        │
│ - 所有时间以 UTC 存储            │
│ - 使用 UTC 范围查询              │
└────────┬────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│    Response 拦截器              │
│ - 递归转换所有 Date 字段         │
│ - 转为目标时区的 ISO 8601 格式   │
└────────┬────────────────────────┘
         │
         ↓
┌──────────────────┐
│   客户端响应      │
│ (已转换的本地时区) │
└──────────────────┘
```

### 时间转换流程

```typescript
// 1. 接收本地时区日期范围
Input:  startDate='2025-11-01', timezone='Asia/Shanghai'

// 2. 理解为该时区的本地时间
Parse:  2025-11-01T00:00:00 (北京时间)

// 3. 转换为 UTC
Convert: 2025-10-31T16:00:00Z (UTC)

// 4. 数据库查询
Query:   WHERE createdAt >= '2025-10-31T16:00:00Z'
           AND createdAt <= '2025-11-01T15:59:59Z'

// 5. 响应转换
Response: createdAt: "2025-11-01T10:30:00+08:00"
```

---

## 功能特性

### ✅ 核心特性

| 特性             | 描述                       | 优势          |
| ---------------- | -------------------------- | ------------- |
| **智能时区转换** | 支持全球 IANA 时区标准     | 100+ 时区支持 |
| **DST 自动处理** | 自动检测夏令时变化         | 避免时间跳变  |
| **多格式支持**   | YYYY-MM-DD 和 ISO8601      | 灵活易用      |
| **时区优先级**   | 请求头 > 环境变量 > 默认值 | 按需配置      |
| **容错机制**     | 无效时区自动降级           | 不中断服务    |
| **递归转换**     | 自动转换嵌套对象中的日期   | 全面覆盖      |

### 📦 工具函数

```typescript
// 1. 本地时区日期范围 → UTC
convertLocalDateRangeToUTC(startDate, endDate, timezone);

// 2. UTC 时间 → 本地时区
convertToTimezone(date, timezone);

// 3. 递归转换对象中的所有日期
convertDatesInObject(obj, timezone);

// 4. 时区有效性验证
isValidTimezone(timezone);
```

---

## 配置指南

### 1. 环境变量配置

#### `.env` 配置

```bash
# 应用默认时区（如未指定请求头则使用）
APP_TIMEZONE=Asia/Shanghai
```

#### `app.config.ts` 配置

```typescript
export const appConfig = () => ({
  app: {
    appTimezone: process.env.APP_TIMEZONE || 'Asia/Shanghai',
  },
});
```

### 2. 时区优先级

系统按以下优先级使用时区（从高到低）：

```
1. 请求头 X-Timezone（最高）
   ↓
2. 环境变量 APP_TIMEZONE
   ↓
3. 默认值 'Asia/Shanghai'（最低）
```

**示例代码**：

```typescript
private getTargetTimezone(providedTimezone?: string): string {
  // 优先级 1：请求头时区
  if (providedTimezone && isValidTimezone(providedTimezone)) {
    return providedTimezone;
  }

  // 优先级 2：环境变量
  const configuredTimezone =
    this.configService.get<string>('app.appTimezone');
  if (configuredTimezone && isValidTimezone(configuredTimezone)) {
    return configuredTimezone;
  }

  // 优先级 3：默认值
  return 'Asia/Shanghai';
}
```

### 3. 依赖安装

```bash
# npm
npm install luxon
npm install -D @types/luxon

# 或 pnpm
pnpm add luxon
pnpm add -D @types/luxon
```

---

## API 使用

### 查询日志

#### 请求格式

```http
GET /api/xxxx?startDate=2025-11-01&endDate=2025-11-02
X-Timezone: Asia/Shanghai
```

#### 参数说明

| 参数         | 类型   | 必需 | 说明                              | 示例            |
| ------------ | ------ | ---- | --------------------------------- | --------------- |
| `startDate`  | string | ✓    | 开始日期（YYYY-MM-DD 或 ISO8601） | `2025-11-01`    |
| `endDate`    | string | ✓    | 结束日期（YYYY-MM-DD 或 ISO8601） | `2025-11-02`    |
| `X-Timezone` | header | ✗    | IANA 时区标识符                   | `Asia/Shanghai` |

#### 使用示例

```bash
# 1. 北京时间查询（整天）
curl -X GET "http://localhost:3000/api/xxxx?startDate=2025-11-01&endDate=2025-11-01" \
  -H "X-Timezone: Asia/Shanghai"

# 2. 指定具体时间范围
curl -X GET "http://localhost:3000/api/xxxx?startDate=2025-11-01T08:00:00&endDate=2025-11-01T18:00:00" \
  -H "X-Timezone: Asia/Shanghai"

# 3. 纽约时间查询
curl -X GET "http://localhost:3000/api/xxxx?startDate=2025-11-01&endDate=2025-11-02" \
  -H "X-Timezone: America/New_York"

# 4. 使用默认时区（不指定请求头）
curl -X GET "http://localhost:3000/api/xxxx?startDate=2025-11-01&endDate=2025-11-02"
```

### 统计接口

```http
POST /api/xxxx/stats
Content-Type: application/json
X-Timezone: Asia/Shanghai

{
  "startDate": "2025-11-01",
  "endDate": "2025-11-02"
}
```

### 响应格式

```json
{
  "code": "200",
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "action": "CREATE",
        "createdAt": "2025-11-01T10:30:00+08:00",
        "updatedAt": "2025-11-01T11:00:00+08:00"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "pageSize": 10,
      "hasMore": true
    }
  },
  "timezone": "Asia/Shanghai",
  "timestamp": "2025-11-01T12:00:00+08:00"
}
```

---

## 实现细节

### Controller 层

```typescript
@Controller('xxxx')
@UseInterceptors(ResponseInterceptor)
export class XxxxController {
  constructor(private readonly xxxxService: XxxxService) {}

  @Get()
  async list(@Query() query: QueryCsDevDto, @Req() req: Request) {
    // 从请求头提取时区
    const timezone = req.headers['x-timezone'] as string;

    // 传递给 Service
    const result = await this.xxxxService.findAll(query, timezone);

    return plainToInstance(PaginatedCsDevVo, result);
  }

  @Post('stats')
  async stats(@Body() body: StatsCsDevDto, @Req() req: Request) {
    const timezone = req.headers['x-timezone'] as string;
    const result = await this.xxxxService.stats(body, timezone);

    return plainToInstance(CsDevStatsVo, result);
  }
}
```

### Service 层

```typescript
@Injectable()
export class XxxxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  /**
   * 获取目标时区（按优先级）
   */
  private getTargetTimezone(providedTimezone?: string): string {
    if (providedTimezone && isValidTimezone(providedTimezone)) {
      return providedTimezone;
    }

    const configuredTimezone =
      this.configService.get<string>('app.appTimezone') || 'Asia/Shanghai';

    return configuredTimezone;
  }

  /**
   * 分页查询
   */
  async findAll(
    query: QueryCsDevDto,
    timezone?: string,
  ): Promise<PaginatedCsDevVo> {
    const targetTimezone = this.getTargetTimezone(timezone);
    const { startDate, endDate, page = 1, pageSize = 10 } = query;

    const where: any = {};

    // 日期范围转换
    if (startDate || endDate) {
      try {
        const dateRange = convertLocalDateRangeToUTC(
          startDate,
          endDate,
          targetTimezone,
        );

        if (dateRange) {
          where.createdAt = {
            gte: dateRange.startUtc,
            lte: dateRange.endUtc,
          };

          this.logger.debug(
            `Date range conversion - Timezone: ${targetTimezone}, ` +
              `Local: ${startDate || 'N/A'} ~ ${endDate || 'N/A'}, ` +
              `UTC: ${dateRange.startUtc.toISOString()} ~ ${dateRange.endUtc.toISOString()}`,
          );
        }
      } catch (error) {
        this.logger.error('日期转换失败', error);
      }
    }

    // 查询
    const [items, total] = await Promise.all([
      this.prisma.xxxxLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.xxxxLog.count({ where }),
    ]);

    // 转换响应时间
    const convertedItems = items.map(item =>
      convertDatesInObject(item, targetTimezone),
    );

    return {
      items: convertedItems,
      pagination: {
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
    };
  }

  /**
   * 统计
   */
  async stats(params: StatsCsDevDto, timezone?: string): Promise<CsDevStatsVo> {
    const targetTimezone = this.getTargetTimezone(timezone);
    // ... 统计逻辑
  }
}
```

### 工具函数

```typescript
// src/common/utils/timezone.util.ts

/**
 * 将本地时区日期范围转换为 UTC
 */
export function convertLocalDateRangeToUTC(
  startDate: string | undefined,
  endDate: string | undefined,
  timezone: string,
): DateRangeUTC | null {
  if (!startDate && !endDate) return null;

  try {
    const isDateOnly = (dateStr: string) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    let startUtc: Date | null = null;
    let endUtc: Date | null = null;

    if (startDate) {
      const dt = isDateOnly(startDate)
        ? DateTime.fromISO(startDate, { zone: timezone })
        : DateTime.fromISO(startDate, { zone: timezone });

      if (!dt.isValid) throw new Error(`Invalid start date: ${startDate}`);
      startUtc = dt.toUTC().toJSDate();
    }

    if (endDate) {
      const dt = isDateOnly(endDate)
        ? DateTime.fromISO(endDate, { zone: timezone }).endOf('day')
        : DateTime.fromISO(endDate, { zone: timezone });

      if (!dt.isValid) throw new Error(`Invalid end date: ${endDate}`);
      endUtc = dt.toUTC().toJSDate();
    }

    if (startUtc && !endUtc) {
      const dt = DateTime.fromISO(startDate!, { zone: timezone }).endOf('day');
      endUtc = dt.toUTC().toJSDate();
    }

    if (!startUtc && endUtc) {
      const dt = DateTime.fromISO(endDate!, { zone: timezone }).startOf('day');
      startUtc = dt.toUTC().toJSDate();
    }

    return { startUtc: startUtc!, endUtc: endUtc! };
  } catch (error) {
    console.error('Date range conversion failed:', error);
    return null;
  }
}

/**
 * 将 UTC 时间转换为目标时区
 */
export function convertToTimezone(
  date: Date | string | null | undefined,
  timezone: string,
): string | null {
  if (!date) return null;

  try {
    let dt: DateTime;

    if (typeof date === 'string') {
      dt = DateTime.fromISO(date, { zone: 'UTC' });
    } else {
      dt = DateTime.fromJSDate(date, { zone: 'UTC' });
    }

    if (!dt.isValid) return null;

    return dt.setZone(timezone).toISO();
  } catch (error) {
    console.error('Timezone conversion error:', error);
    return null;
  }
}

/**
 * 递归转换对象中的所有 Date 字段
 */
export function convertDatesInObject<T>(obj: T, timezone: string): T {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Date) {
    return convertToTimezone(obj, timezone) as any;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertDatesInObject(item, timezone)) as any;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertDatesInObject(obj[key], timezone);
      }
    }
    return result;
  }

  return obj;
}

/**
 * 验证时区是否有效
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
```

---

## 前端集成

### 自动检测用户时区

```typescript
// 获取浏览器时区
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log(userTimezone); // 例如: "Asia/Shanghai"
```

### 全局请求拦截器

#### Axios 配置

```typescript
import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// 请求拦截器
api.interceptors.request.use(config => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  config.headers['X-Timezone'] = timezone;
  return config;
});

export default api;
```

#### React Hook 示例

```typescript
import { useEffect } from 'react';
import axios from 'axios';

export function useTimezone() {
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    axios.interceptors.request.use(config => {
      config.headers['X-Timezone'] = timezone;
      return config;
    });
  }, []);
}

// 在组件中使用
function App() {
  useTimezone();
  return <div>Your App</div>;
}
```

#### Vue 配置

```typescript
// main.ts
import axios from 'axios';

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

axios.interceptors.request.use(config => {
  config.headers['X-Timezone'] = timezone;
  return config;
});
```

---

## 测试用例

### 单元测试

```typescript
describe('convertLocalDateRangeToUTC', () => {
  test('北京时间单日查询', () => {
    const result = convertLocalDateRangeToUTC(
      '2025-11-01',
      '2025-11-01',
      'Asia/Shanghai',
    );

    expect(result?.startUtc.toISOString()).toBe('2025-10-31T16:00:00.000Z');
    expect(result?.endUtc.toISOString()).toBe('2025-11-01T15:59:59.999Z');
  });

  test('纽约时间 EDT 转换', () => {
    const result = convertLocalDateRangeToUTC(
      '2025-06-01',
      '2025-06-01',
      'America/New_York',
    );

    expect(result?.startUtc.toISOString()).toBe('2025-06-01T04:00:00.000Z');
  });
});

describe('convertToTimezone', () => {
  test('UTC 转北京时间', () => {
    const result = convertToTimezone(
      new Date('2025-10-06T08:44:25.558Z'),
      'Asia/Shanghai',
    );

    expect(result).toBe('2025-10-06T16:44:25.558+08:00');
  });
});
```

### 集成测试

```bash
# 北京时间查询
curl -X GET "http://localhost:3000/api/xxxx?startDate=2025-11-01&endDate=2025-11-02" \
  -H "X-Timezone: Asia/Shanghai" \
  -H "Authorization: Bearer <token>"

# 预期响应
{
  "code": "200",
  "data": {
    "items": [
      {
        "createdAt": "2025-11-01T10:30:00+08:00"
      }
    ]
  },
  "timezone": "Asia/Shanghai"
}
```

---

## 常见问题

### Q1: 数据库中存储的是什么时间？

**A**: 数据库存储 **UTC 时间**（0 时区），这是业界标准。

```sql
SELECT id, action, createdAt FROM xxxx_logs LIMIT 1;
-- 输出: 2025-10-06 08:44:25.558 (UTC 格式)
```

### Q2: 为什么要在应用层而不是数据库层转换？

**A**: 原因如下：

1. **性能** - 应用层转换避免数据库函数开销
2. **灵活性** - 同一时间可转为多个时区
3. **可维护性** - 时区逻辑集中管理
4. **兼容性** - 不同 SQL 方言时区处理不一

### Q3: 如何处理夏令时？

**A**: Luxon 自动处理 DST 转换，无需手动处理。

```typescript
// 2025-03-09 美国夏令时切换（EST → EDT）
const beforeDST = convertToTimezone(
  '2025-03-09T06:00:00.000Z',
  'America/New_York',
);
// 输出: "2025-03-09T01:00:00.000-05:00" (EST, UTC-5)

const afterDST = convertToTimezone(
  '2025-03-09T08:00:00.000Z',
  'America/New_York',
);
// 输出: "2025-03-09T04:00:00.000-04:00" (EDT, UTC-4)
```

### Q4: 无效时区会怎样？

**A**: 系统使用降级策略，不会报错。

```typescript
// 无效时区自动使用默认值
const result = convertToTimezone(date, 'Invalid/Timezone');
// 返回: null (系统会使用 APP_TIMEZONE)
```

### Q5: 前端如何显示本地时间？

**A**: 直接显示服务端返回的时间（已转换）。

```typescript
const response = await api.get('/xxxx');
// response.data.items[0].createdAt 已是本地时区
console.log(response.data.items[0].createdAt);
// "2025-11-01T10:30:00+08:00" ✅
```

### Q6: 支持哪些时区？

**A**: 所有 IANA 时区数据库中的标准时区。常用时区见 [参考资源](#参考资源) 一节。

---

## 最佳实践

### ✅ 推荐做法

1. **数据库统一存储 UTC**

   ```sql
   -- 好 ✅
   createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP  -- UTC
   ```

2. **应用层处理转换**

   ```typescript
   // 好 ✅
   const result = convertToTimezone(dbDate, userTimezone);
   ```

3. **请求头传递时区**

   ```http
   // 好 ✅
   GET /api/xxxx
   X-Timezone: Asia/Shanghai
   ```

4. **响应包含时区标识**

   ```json
   {
     "data": {...},
     "timezone": "Asia/Shanghai"
   }
   ```

5. **环境变量配置默认时区**
   ```bash
   # 好 ✅
   APP_TIMEZONE=Asia/Shanghai
   ```

### ❌ 避免做法

1. **在数据库存储本地时间**

   ```sql
   -- 差 ❌
   createdAt DATETIME(3) DEFAULT NOW()  -- 本地时间
   ```

2. **数据库层转换时区**

   ```sql
   -- 差 ❌
   CONVERT_TZ(createdAt, '+00:00', '+08:00')
   ```

3. **硬编码时区**

   ```typescript
   // 差 ❌
   const tz = 'Asia/Shanghai'; // 硬编码
   ```

4. **前端重复转换**
   ```typescript
   // 差 ❌
   new Date(response.data.createdAt).toLocaleString(); // 后端已转换
   ```

---

## 参考资源

### 常用时区列表

| 地区      | 时区标识              | UTC 偏移      | 说明                  |
| --------- | --------------------- | ------------- | --------------------- |
| 🇨🇳 中国   | `Asia/Shanghai`       | +08:00        | 中国标准时间（全年）  |
| 🇭🇰 香港   | `Asia/Hong_Kong`      | +08:00        | 香港时间              |
| 🇯🇵 日本   | `Asia/Tokyo`          | +09:00        | 日本标准时间          |
| 🇦🇺 悉尼   | `Australia/Sydney`    | +10:00/+11:00 | 澳大利亚东部（DST）   |
| 🇬🇧 伦敦   | `Europe/London`       | +00:00/+01:00 | 格林威治/英国夏令时   |
| 🇫🇷 巴黎   | `Europe/Paris`        | +01:00/+02:00 | 中欧时间/CEST         |
| 🇺🇸 纽约   | `America/New_York`    | -05:00/-04:00 | 东部时间（EST/EDT）   |
| 🇺🇸 洛杉矶 | `America/Los_Angeles` | -08:00/-07:00 | 太平洋时间（PST/PDT） |
| 🇧🇷 圣保罗 | `America/Sao_Paulo`   | -03:00        | 巴西利亚时间          |
| 🇮🇳 印度   | `Asia/Kolkata`        | +05:30        | 印度标准时间          |

### 外部文档

- [IANA 时区数据库](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
- [ISO 8601 标准](https://en.wikipedia.org/wiki/ISO_8601)
- [Luxon 官方文档](https://moment.github.io/luxon/)
- [MDN - Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)

---
