# 时区转换使用指南

## 概述

系统已实现智能时区转换功能，所有响应数据中的时间字段会自动转换为目标时区。

## 特性

- ✅ **数据库存储 UTC 时间**（标准做法，多项目兼容）
- ✅ **响应时自动转换**为目标时区
- ✅ **支持动态时区配置**（环境变量 + 请求头）
- ✅ **国际化友好**（支持全球所有 IANA 时区）

## 配置方式

### 1. 环境变量配置（默认时区）

在 `.env` 文件中配置：

```bash
# 应用默认时区
APP_TIMEZONE=Asia/Shanghai
```

支持的常用时区：

- `Asia/Shanghai` - 中国标准时间 (UTC+8)
- `America/New_York` - 美国东部时间 (UTC-5/-4)
- `Europe/London` - 格林威治标准时间 (UTC+0/+1)
- `Asia/Tokyo` - 日本标准时间 (UTC+9)
- `Australia/Sydney` - 澳大利亚东部时间 (UTC+10/+11)
- 更多时区：https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

### 2. 客户端请求头（动态指定）

客户端可以通过 `X-Timezone` 请求头指定时区：

```bash
curl http://localhost:8000/api/v1/users \
  -H "X-Timezone: America/New_York"
```

**优先级**：

1. 请求头 `X-Timezone`（最高）
2. 环境变量 `APP_TIMEZONE`
3. 默认 `Asia/Shanghai`

## 响应格式

### 转换前（UTC）

```json
{
  "code": "200",
  "message": "success",
  "data": {
    "id": 1,
    "username": "admin",
    "createdAt": "2025-10-06T08:44:25.558Z"
  },
  "timestamp": "2025-10-06T08:44:25.435Z",
  "requestId": "uuid"
}
```

### 转换后（Asia/Shanghai）

```json
{
  "code": "200",
  "message": "success",
  "data": {
    "id": 1,
    "username": "admin",
    "createdAt": "2025-10-06T16:44:25.558+08:00"
  },
  "timestamp": "2025-10-06T16:44:25.435+08:00",
  "timezone": "Asia/Shanghai",
  "requestId": "uuid"
}
```

**时间格式说明**：

- 格式：ISO 8601 标准 `YYYY-MM-DDTHH:mm:ss.sss±HH:mm`
- 示例：`2025-10-06T16:44:25.558+08:00`
  - 日期：2025-10-06
  - 时间：16:44:25.558
  - 时区偏移：+08:00（比 UTC 快 8 小时）

## 前端集成示例

### JavaScript/TypeScript

```typescript
// 1. 自动获取用户浏览器时区
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log(userTimezone); // 例如: "Asia/Shanghai"

// 2. 发送请求时携带时区
async function fetchUsers() {
  const response = await fetch('http://localhost:8000/api/v1/users', {
    headers: {
      'X-Timezone': userTimezone,
      Authorization: 'Bearer <token>',
    },
  });

  const data = await response.json();
  console.log('Server timezone:', data.timezone);
  console.log('Created at:', data.data.createdAt);
}

// 3. 如果需要在前端再次转换（通常不需要，因为服务端已转换）
const serverTime = new Date('2025-10-06T16:44:25.558+08:00');
console.log(serverTime.toLocaleString('zh-CN')); // "2025/10/6 16:44:25"
```

### React 示例

```typescript
import { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [timezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  useEffect(() => {
    // 设置全局请求拦截器
    axios.interceptors.request.use(config => {
      config.headers['X-Timezone'] = timezone;
      return config;
    });
  }, [timezone]);

  return <div>时区: {timezone}</div>;
}
```

### Vue 示例

```typescript
import axios from 'axios';

// main.ts
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

axios.interceptors.request.use(config => {
  config.headers['X-Timezone'] = timezone;
  return config;
});
```

## 测试示例

### 1. 使用默认时区

```bash
curl http://localhost:8000/api/v1/users
```

响应中的时间使用 `APP_TIMEZONE` 配置的时区（默认 Asia/Shanghai）。

### 2. 指定纽约时区

```bash
curl http://localhost:8000/api/v1/users \
  -H "X-Timezone: America/New_York"
```

响应中的时间自动转换为纽约时间。

### 3. 指定伦敦时区

```bash
curl http://localhost:8000/api/v1/users \
  -H "X-Timezone: Europe/London"
```

### 4. 指定东京时区

```bash
curl http://localhost:8000/api/v1/users \
  -H "X-Timezone: Asia/Tokyo"
```

## 常见问题

### Q1: 数据库存储的是什么时间？

**A**: 数据库存储的是 **UTC 时间**（0 时区），这是业界标准做法。

### Q2: 如何验证数据库存储的时间？

**A**: 直接查询数据库：

```sql
SELECT id, username, createdAt FROM users;
```

你会看到类似 `2025-10-06 08:44:25.558` 的时间（UTC 时间）。

### Q3: 为什么不直接存储本地时间？

**A**: 原因：

1. **多时区兼容**：不同地区的用户可以看到各自时区的时间
2. **夏令时问题**：UTC 没有夏令时，避免时间跳变
3. **多项目兼容**：其他语言/框架的项目也能正确读取

### Q4: 前端如何处理返回的时间？

**A**: 通常不需要额外处理，因为服务端已经转换好了。如果需要：

```javascript
// 服务端返回的是 ISO 8601 格式，JavaScript 可以直接解析
const date = new Date('2025-10-06T16:44:25.558+08:00');

// 格式化显示
console.log(date.toLocaleString('zh-CN')); // "2025/10/6 16:44:25"
console.log(date.toISOString()); // "2025-10-06T08:44:25.558Z" (转回 UTC)
```

### Q5: 如何为不同地区的客户配置不同时区？

**A**: 有两种方式：

**方式 1：部署时配置**（推荐）

```bash
# 中国区部署
APP_TIMEZONE=Asia/Shanghai

# 美国区部署
APP_TIMEZONE=America/New_York
```

**方式 2：客户端动态指定**

```javascript
// 前端自动检测用户所在时区
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// 所有请求自动携带
```

### Q6: 无效的时区会怎样？

**A**: 系统会验证时区是否有效，如果无效则使用默认时区，不会报错。

```typescript
// 内部实现
function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false; // 无效时区，使用默认值
  }
}
```

## 技术实现

### 核心工具函数

位置：`src/common/utils/timezone.util.ts`

```typescript
import {
  convertToTimezone,
  convertDatesInObject,
} from '@/common/utils/timezone.util';

// 单个日期转换
const localTime = convertToTimezone(
  new Date('2025-10-06T08:44:25.558Z'),
  'Asia/Shanghai',
);
// 输出: "2025-10-06T16:44:25.558+08:00"

// 递归转换对象中的所有日期
const data = {
  user: {
    createdAt: new Date('2025-10-06T08:44:25.558Z'),
    updatedAt: new Date('2025-10-06T09:00:00.000Z'),
  },
};
const converted = convertDatesInObject(data, 'Asia/Shanghai');
```

### 响应拦截器

位置：`src/common/interceptors/response.interceptor.ts`

自动拦截所有响应，转换时间字段。

## 最佳实践

1. ✅ **统一使用 UTC 存储**：数据库、日志、文件等
2. ✅ **响应时转换**：在 API 响应时根据客户端需要转换
3. ✅ **携带时区信息**：响应中包含 `timezone` 字段，明确告知客户端
4. ✅ **使用 ISO 8601 格式**：标准格式，所有语言都支持
5. ❌ **避免在数据库存储本地时间**：会导致多时区混乱

## 相关文档

- [IANA 时区数据库](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
- [ISO 8601 标准](https://en.wikipedia.org/wiki/ISO_8601)
- [JavaScript Date API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [Intl.DateTimeFormat API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)

**维护者**: XSIJIE
**最后更新**: 2025-10-10
