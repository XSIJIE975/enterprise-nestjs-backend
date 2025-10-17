# JWT 认证模块文档

> **功能**: 完整的 JWT 认证系统，包含用户注册、登录、Token 刷新、单设备登录、Token 黑名单等功能

---

## 📋 目录

1. [功能概述](#功能概述)
2. [技术实现](#技术实现)
3. [API 接口](#api-接口)
4. [使用示例](#使用示例)
5. [安全机制](#安全机制)
6. [注意事项](#注意事项)

---

## 功能概述

### ✅ 已实现功能

- **用户注册**: 邮箱 + 用户名 + 密码注册
- **用户登录**: 支持用户名/邮箱 + 密码登录
- **Token 机制**: Access Token (15分钟) + Refresh Token (7天)
- **Token 刷新**: Refresh Token 自动刷新 Access Token
- **用户退出**: 主动退出登录并撤销 Token
- **单设备登录**: 新设备登录自动踢掉旧设备
- **Token 黑名单**: Redis 存储黑名单，实时失效 Token
- **会话管理**: MySQL 存储会话信息，Redis 缓存加速
- **密码加密**: bcrypt 加密存储密码
- **参数验证**: class-validator 全面验证

---

## 技术实现

### 核心技术栈

- **NestJS 11.x**: 后端框架
- **Passport.js**: 认证中间件
  - `passport-jwt`: JWT 策略
  - `passport-local`: 本地策略
- **@nestjs/jwt**: JWT 令牌生成和验证
- **bcrypt**: 密码加密
- **class-validator**: DTO 验证
- **Prisma**: ORM，操作 MySQL
- **Redis**: 缓存和黑名单存储

### 架构设计

```
┌─────────────────────────────────────────────┐
│           AuthController (控制器)            │
│  - POST /auth/register (注册)                │
│  - POST /auth/login (登录)                   │
│  - POST /auth/refresh (刷新Token)            │
│  - POST /auth/logout (退出)                  │
│  - POST /auth/me (获取当前用户)              │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┴──────────────────────────┐
│           AuthService (认证服务)             │
│  - validateUser() 验证用户                   │
│  - register() 用户注册                       │
│  - login() 用户登录                          │
│  - refreshToken() 刷新Token                  │
│  - logout() 退出登录                         │
│  - revokeAllUserSessions() 撤销所有会话      │
│  - isTokenBlacklisted() 检查黑名单           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┴──────────────────────────┐
│              Guards (守卫)                   │
│  - JwtAuthGuard: JWT认证守卫                 │
│  - LocalAuthGuard: 本地认证守卫              │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┴──────────────────────────┐
│            Strategies (策略)                 │
│  - JwtStrategy: JWT验证策略                  │
│  - LocalStrategy: 本地验证策略               │
└─────────────────────────────────────────────┘
```

### 数据存储

#### MySQL 表结构

**users 表**

- 存储用户基本信息
- 密码使用 bcrypt 加密（12轮）

**user_sessions 表**

- 存储用户会话信息
- 包含 Access Token 和 Refresh Token
- 记录设备信息、IP、User Agent
- 支持会话激活/撤销状态

#### Redis 缓存

**Token 黑名单**

- Key: `token:blacklist:{token}`
- Value: `1`
- TTL: Token 过期时间

**用户会话缓存**

- Key: `user:session:{userId}`
- Value: JSON 格式的会话信息
- TTL: 7天

---

## API 接口

### 1. 用户注册

**接口**: `POST /api/v1/auth/register`

**请求体**:

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "13800138000"
}
```

**响应**:

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "message": "注册成功，请登录"
}
```

### 2. 用户登录

**接口**: `POST /api/v1/auth/login`

**请求体**:

```json
{
  "username": "admin@enterprise.local",
  "password": "admin123456"
}
```

**响应**:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@enterprise.local",
    "firstName": "Admin",
    "lastName": "User",
    "avatar": null
  }
}
```

### 3. 刷新 Token

**接口**: `POST /api/v1/auth/refresh`

**请求体**:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应**: 同登录响应，返回新的 Access Token 和 Refresh Token

### 4. 退出登录

**接口**: `POST /api/v1/auth/logout`

**请求头**:

```
Authorization: Bearer {accessToken}
```

**响应**:

```json
{
  "message": "退出登录成功"
}
```

### 5. 获取当前用户信息

**接口**: `POST /api/v1/auth/me`

**请求头**:

```
Authorization: Bearer {accessToken}
```

**响应**:

```json
{
  "userId": 1,
  "username": "admin",
  "email": "admin@enterprise.local",
  "roles": ["admin"],
  "permissions": ["read", "write", "delete"]
}
```

---

## 使用示例

### 前端登录流程

```typescript
// 1. 用户登录
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin@enterprise.local',
    password: 'admin123456',
  }),
});

const { accessToken, refreshToken } = await loginResponse.json();

// 2. 存储 Token
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// 3. 使用 Access Token 访问受保护的接口
const response = await fetch('/api/v1/users', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

// 4. Token 过期时刷新
if (response.status === 401) {
  const refreshResponse = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const newTokens = await refreshResponse.json();
  localStorage.setItem('accessToken', newTokens.accessToken);
  localStorage.setItem('refreshToken', newTokens.refreshToken);
}

// 5. 退出登录
await fetch('/api/v1/auth/logout', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

### 后端使用守卫保护路由

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  // 需要认证的接口
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return '这是受保护的接口';
  }
}
```

---

## 安全机制

### 1. 密码安全

- **加密算法**: bcrypt
- **加密轮数**: 12 轮（可配置）
- **不可逆**: 无法解密，只能验证

### 2. Token 安全

- **Access Token**:
  - 短生命周期（默认15分钟，可配置）
  - 用于日常 API 访问
  - 存储在内存或 sessionStorage

- **Refresh Token**:
  - 长生命周期（默认7天，可配置）
  - 仅用于刷新 Access Token
  - 存储在 HttpOnly Cookie（推荐）或 localStorage

### 3. 多设备登录策略

- 新设备登录时，自动撤销最大允许的会话数中最早的会话
- 旧设备的所有 Token 立即撤销并加入黑名单
- 旧设备再次访问时会收到 401 Unauthorized

### 4. Token 黑名单机制

- 退出登录时，Token 加入 Redis 黑名单
- JWT 策略验证时，检查 Token 是否在黑名单中
- 黑名单 Token 自动过期（根据 Token TTL）

### 5. 会话管理

- 所有会话信息存储在 `user_sessions` 表
- 包含设备信息、IP、User Agent
- 支持查询用户的所有活跃会话
- 管理员可强制撤销用户会话

### 6. 参数验证

- 所有 DTO 使用 class-validator 验证
- 邮箱格式验证
- 密码强度验证（必须包含大小写字母和数字）
- 用户名格式验证（3-20个字符，字母数字下划线）

---

## 注意事项

### 1. 环境配置

确保 `.env` 文件中配置了以下变量：

```bash
# JWT 配置（通过 src/config/jwt.config.ts 管理）
JWT_ACCESS_SECRET=your-access-secret-min-32-chars        # 读取路径：jwt.accessTokenSecret
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars      # 读取路径：jwt.refreshTokenSecret
JWT_ACCESS_EXPIRES_IN=15m                                 # 读取路径：jwt.accessTokenExpiresIn
JWT_REFRESH_EXPIRES_IN=7d                                 # 读取路径：jwt.refreshTokenExpiresIn
JWT_ISSUER=enterprise-nestjs-backend                      # 读取路径：jwt.issuer
JWT_AUDIENCE=enterprise-nestjs-backend                    # 读取路径：jwt.audience

# 密码加密（通过 src/config/security.config.ts 管理）
BCRYPT_ROUNDS=12                                          # 读取路径：security.bcrypt.rounds
```

> **配置说明**：所有配置通过对应的 config 模块统一管理，使用 `configService.get('命名空间.属性')` 访问。

### 2. 测试账户

系统初始化后会创建以下测试账户：

**管理员账户**:

- 邮箱: `admin@enterprise.local`
- 密码: `admin123456`

**测试账户**:

- 邮箱: `test@enterprise.local`
- 密码: `test123456`

### 3. Token 存储建议

**前端存储方案**:

| 方案                | 优点     | 缺点         | 推荐场景         |
| ------------------- | -------- | ------------ | ---------------- |
| **Memory**          | XSS 安全 | 刷新页面丢失 | SPA 应用         |
| **SessionStorage**  | 会话级别 | 刷新页面丢失 | 单页面应用       |
| **LocalStorage**    | 持久化   | XSS 风险     | 需要持久化的应用 |
| **HttpOnly Cookie** | XSS 安全 | 需要后端配合 | 推荐方案         |

### 4. 常见错误处理

| 错误码    | 描述               | 解决方案                |
| --------- | ------------------ | ----------------------- |
| `AT10001` | Token 无效         | 重新登录                |
| `AT10002` | Token 过期         | 使用 Refresh Token 刷新 |
| `AT10004` | Refresh Token 无效 | 重新登录                |
| `AU10001` | 用户名或密码错误   | 检查凭证                |
| `AU10003` | 账户已被禁用       | 联系管理员              |
| `AS10000` | 会话已过期         | 重新登录                |

### 5. 性能优化

- Redis 缓存用户会话信息，减少数据库查询
- Token 黑名单使用 Redis，快速验证
- 数据库连接池优化
- 异步日志记录

### 6. 扩展性

支持以下扩展：

- **多因素认证 (MFA)**: 添加 TOTP 或 SMS 验证
- **OAuth2.0**: 集成第三方登录（GitHub、Google 等）
- **多设备登录**: 修改为允许多设备同时登录
- **Token 续期**: 实现无感知 Token 续期
- **设备管理**: 用户查看和管理登录设备

---

## 相关文档

- [API 文档](http://localhost:8000/api/docs)
- [架构设计文档](../../docs/architecture/overview.md)

---

**维护者**: XSIJIE
**最后更新**: 2025-10-17
