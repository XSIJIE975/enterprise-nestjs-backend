# 审计日志装饰器使用指南

> 📌 **维护者**: XSIJIE | **最后更新**: 2026-02-06

> 基于 AOP 模式的 `@AuditLog()` 装饰器，实现 RBAC 操作的自动审计日志记录

---

## 概述

审计日志装饰器模块提供了一种声明式的方式来记录业务操作的审计日志。通过在 Service 方法上添加 `@AuditLog()` 装饰器，系统会自动：

- 在方法执行**前**获取资源的旧数据（oldData）
- 在方法执行**后**记录新数据（newData）
- 自动提取请求上下文（userId、ip、requestId 等）
- 异步写入数据库，不阻塞业务逻辑

### 核心特性

| 特性       | 说明                             |
| ---------- | -------------------------------- |
| 声明式配置 | 通过装饰器参数配置审计行为       |
| 前置查询   | 在业务方法执行前获取 oldData     |
| 异步记录   | Fire-and-forget 模式，不阻塞响应 |
| 批量支持   | 支持批量删除等批量操作的审计     |
| 条件记录   | 支持根据执行结果决定是否记录     |
| 优雅降级   | 服务未注入时自动跳过审计         |

---

## 快速开始

### 1. 在 Service 中注入 AuditLogService

```typescript
import { Injectable } from '@nestjs/common';
import { AuditLogService } from '@/shared/audit/audit-log.service';

@Injectable()
export class RolesService {
  constructor(
    // ... 其他依赖
    private readonly auditLogService: AuditLogService, // 必须注入
  ) {}
}
```

### 2. 在方法上使用 @AuditLog 装饰器

```typescript
import { AuditLog } from '@/common/decorators/audit-log.decorator';
import { AuditAction, AuditResource } from '@/common/constants/audit.constants';

@AuditLog({
  action: AuditAction.CREATE,
  resource: AuditResource.role,
  resourceIdFromResult: 'id', // CREATE 操作：从返回值获取 ID
})
async create(dto: CreateRoleDto): Promise<Role> {
  return this.roleRepository.create(dto);
}
```

---

## 装饰器配置选项

### IAuditLogOptions 接口

```typescript
interface IAuditLogOptions {
  // 必填项
  action: AuditAction; // 操作类型
  resource: AuditResource; // 资源类型

  // 资源 ID 提取方式（三选一）
  resourceIdArg?: number; // 从第 N 个参数获取
  resourceIdPath?: string; // 从参数对象的路径获取
  resourceIdFromResult?: string; // 从返回值的路径获取（CREATE 用）

  // 可选配置
  batch?: boolean; // 是否为批量操作
  condition?: (args, result, context) => boolean; // 条件判断函数
}
```

### 操作类型 (AuditAction)

```typescript
enum AuditAction {
  // 基础操作
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  UPDATE_STATUS = 'UPDATE_STATUS',
  DELETE = 'DELETE',
  BATCH_DELETE = 'BATCH_DELETE',

  // RBAC 权限操作
  ASSIGN_PERMISSIONS = 'ASSIGN_PERMISSIONS',
  ASSIGN_ROLES = 'ASSIGN_ROLES',
  REMOVE_ROLE = 'REMOVE_ROLE',

  // 用户操作
  UPDATE_PROFILE = 'UPDATE_PROFILE',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
  VERIFY_USER = 'VERIFY_USER',
  CREATE_USER = 'CREATE_USER',
}
```

### 资源类型 (AuditResource)

```typescript
enum AuditResource {
  role = 'role',
  permission = 'permission',
  user = 'user',
}
```

---

## 使用场景示例

### 场景 1: CREATE 操作

创建操作的资源 ID 在方法执行后才能获取，使用 `resourceIdFromResult`：

```typescript
@AuditLog({
  action: AuditAction.CREATE,
  resource: AuditResource.role,
  resourceIdFromResult: 'id', // 从返回值的 id 字段获取
})
async create(dto: CreateRoleDto): Promise<Role> {
  return this.roleRepository.create(dto);
}
```

**审计日志内容：**

- `oldData`: `null`（创建操作无旧数据）
- `newData`: 创建后的完整角色对象

### 场景 2: UPDATE 操作

更新操作需要在执行前获取旧数据，使用 `resourceIdArg`：

```typescript
@AuditLog({
  action: AuditAction.UPDATE,
  resource: AuditResource.role,
  resourceIdArg: 0, // 第一个参数是资源 ID
})
async update(id: number, dto: UpdateRoleDto): Promise<Role> {
  return this.roleRepository.update(id, dto);
}
```

**审计日志内容：**

- `oldData`: 更新前的角色数据（自动获取）
- `newData`: 更新后的角色数据

### 场景 3: DELETE 操作

```typescript
@AuditLog({
  action: AuditAction.DELETE,
  resource: AuditResource.permission,
  resourceIdArg: 0,
})
async delete(id: number): Promise<void> {
  await this.permissionRepository.delete(id);
}
```

**审计日志内容：**

- `oldData`: 删除前的权限数据（自动获取）
- `newData`: `null`

### 场景 4: 批量删除操作

使用 `batch: true` 标记批量操作：

```typescript
@AuditLog({
  action: AuditAction.BATCH_DELETE,
  resource: AuditResource.role,
  resourceIdArg: 0, // 第一个参数是 ID 数组
  batch: true,      // 标记为批量操作
})
async batchDelete(ids: number[]): Promise<void> {
  await this.roleRepository.deleteMany(ids);
}
```

**特性：**

- 为每个被删除的资源生成独立的审计日志记录
- 所有记录共享相同的 `requestId`，便于关联查询
- `oldData` 自动批量获取

### 场景 5: 从 DTO 路径获取资源 ID

当资源 ID 在 DTO 对象内部时，使用 `resourceIdPath`：

```typescript
@AuditLog({
  action: AuditAction.ASSIGN_PERMISSIONS,
  resource: AuditResource.role,
  resourceIdPath: 'roleId', // 从第一个参数的 roleId 字段获取
})
async assignPermissions(dto: AssignPermissionsDto): Promise<Role> {
  const { roleId, permissionIds } = dto;
  return this.roleRepository.assignPermissions(roleId, permissionIds);
}
```

### 场景 6: 条件记录

只在特定条件下记录审计日志：

```typescript
@AuditLog({
  action: AuditAction.UPDATE,
  resource: AuditResource.user,
  resourceIdArg: 0,
  // 只有更新成功时才记录
  condition: (args, result, context) => result !== null,
})
async updateProfile(userId: number, dto: UpdateProfileDto): Promise<User | null> {
  return this.userRepository.update(userId, dto);
}
```

---

## 资源适配器

### 什么是资源适配器？

资源适配器负责根据资源 ID 获取资源的完整数据。每种资源类型都有对应的适配器：

| 资源类型   | 适配器            | 说明                             |
| ---------- | ----------------- | -------------------------------- |
| role       | RoleAdapter       | 获取角色数据，包含关联的权限列表 |
| permission | PermissionAdapter | 获取权限数据                     |
| user       | UserAdapter       | 获取用户数据（排除敏感字段）     |

### 适配器实现示例

```typescript
// src/shared/audit/adapters/role.adapter.ts
@Injectable()
export class RoleAdapter implements IResourceAdapter {
  resource = AuditResource.role;

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string | number): Promise<any> {
    return this.prisma.role.findUnique({
      where: { id: Number(id) },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async findByIds(ids: (string | number)[]): Promise<any[]> {
    return this.prisma.role.findMany({
      where: { id: { in: ids.map(Number) } },
      include: { permissions: { include: { permission: true } } },
    });
  }
}
```

### 添加新的资源适配器

1. **创建适配器类**：

```typescript
// src/shared/audit/adapters/order.adapter.ts
@Injectable()
export class OrderAdapter implements IResourceAdapter {
  resource = AuditResource.order; // 需要先在枚举中添加

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string | number): Promise<any> {
    return this.prisma.order.findUnique({
      where: { id: Number(id) },
      include: { items: true, customer: true },
    });
  }

  async findByIds(ids: (string | number)[]): Promise<any[]> {
    return this.prisma.order.findMany({
      where: { id: { in: ids.map(Number) } },
      include: { items: true, customer: true },
    });
  }
}
```

2. **在 AuditLogModule 中注册**：

```typescript
// src/shared/audit/audit-log.module.ts
@Module({
  providers: [
    // ... 其他 providers
    OrderAdapter, // 添加新适配器
  ],
})
export class AuditLogModule implements OnModuleInit {
  constructor(
    private readonly registry: ResourceAdapterRegistry,
    // ... 其他适配器
    private readonly orderAdapter: OrderAdapter,
  ) {}

  onModuleInit() {
    // ... 注册其他适配器
    this.registry.register(this.orderAdapter);
  }
}
```

3. **在常量中添加资源类型**：

```typescript
// src/common/constants/audit.constants.ts
export enum AuditResource {
  role = 'role',
  permission = 'permission',
  user = 'user',
  order = 'order', // 新增
}
```

---

## 架构设计

### 执行流程

```
┌─────────────────────────────────────────────────────────────────┐
│                     @AuditLog 装饰器执行流程                      │
└─────────────────────────────────────────────────────────────────┘

1. 方法调用
     │
     ▼
2. 装饰器拦截
     │
     ├── 检查 auditLogService 是否存在
     │       │
     │       ├── 不存在 → 警告日志 → 直接执行原方法
     │       │
     │       └── 存在 → 继续
     │
     ▼
3. AuditLogService.execute()
     │
     ├── 3.1 从参数提取 resourceId（UPDATE/DELETE）
     │
     ├── 3.2 如果有 resourceId → 调用适配器获取 oldData（阻塞）
     │
     ├── 3.3 执行原业务方法（阻塞）
     │
     ├── 3.4 从返回值提取 resourceId（CREATE）
     │
     ├── 3.5 检查 condition 条件
     │       │
     │       ├── 不满足 → 直接返回 result
     │       │
     │       └── 满足 → 继续
     │
     └── 3.6 异步创建审计日志（不阻塞）
              │
              └── createAuditLogAsync()
                    │
                    ├── 获取请求上下文（userId, ip, requestId）
                    │
                    ├── 批量操作 → prisma.auditLog.createMany()
                    │
                    └── 单条操作 → logsService.createAuditLog()
     │
     ▼
4. 返回 result
```

### 模块依赖关系

```
┌─────────────────────────────────────────────────────────────────┐
│                         AppModule                                │
│   imports: [AuditLogModule]                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AuditLogModule                             │
│   @Global()                                                      │
│   imports: [LogsModule]                                          │
│   providers:                                                     │
│     - AuditLogService                                            │
│     - ResourceAdapterRegistry                                    │
│     - RoleAdapter, PermissionAdapter, UserAdapter                │
│   exports: [AuditLogService]                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
     ┌───────────┐     ┌───────────┐     ┌───────────┐
     │ RolesService │   │PermissionsService│ │ UsersService │
     │ @AuditLog  │   │ @AuditLog  │     │ @AuditLog  │
     └───────────┘     └───────────┘     └───────────┘
```

---

## 审计日志查询

### API 端点

```http
GET /api/v1/logs/audit?page=1&pageSize=20&action=UPDATE&resource=role&userId=1
```

### 查询参数

| 参数       | 类型          | 说明         |
| ---------- | ------------- | ------------ |
| page       | number        | 页码         |
| pageSize   | number        | 每页数量     |
| action     | AuditAction   | 操作类型筛选 |
| resource   | AuditResource | 资源类型筛选 |
| userId     | string        | 操作用户 ID  |
| resourceId | string        | 资源 ID      |
| startDate  | string        | 开始时间     |
| endDate    | string        | 结束时间     |

### 根据 requestId 查询批量操作

批量操作会为每条记录生成相同的 `requestId`，可用于关联查询：

```sql
-- 查询某次批量删除的所有记录
SELECT * FROM audit_logs
WHERE requestId = 'xxx-xxx-xxx'
ORDER BY createdAt;
```

---

## 数据库表结构

审计日志存储在 `audit_logs` 表中：

```prisma
model AuditLog {
  id         Int      @id @default(autoincrement())
  userId     String?  @db.VarChar(36)
  requestId  String?  @db.VarChar(36)  // 用于关联批量操作
  action     String   @db.VarChar(50)
  resource   String   @db.VarChar(50)
  resourceId String?  @db.VarChar(50)
  oldData    Json?
  newData    Json?
  ip         String?  @db.VarChar(50)
  userAgent  String?  @db.VarChar(500)
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([resource])
  @@index([resourceId])
  @@index([requestId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

---

## 最佳实践

### 1. 始终注入 AuditLogService

```typescript
// ✅ 正确
@Injectable()
export class MyService {
  constructor(private readonly auditLogService: AuditLogService) {}
}

// ❌ 错误 - 装饰器不会生效
@Injectable()
export class MyService {
  // 未注入 auditLogService
}
```

### 2. 合理选择资源 ID 提取方式

| 操作类型      | 推荐方式               | 原因               |
| ------------- | ---------------------- | ------------------ |
| CREATE        | `resourceIdFromResult` | ID 在创建后才存在  |
| UPDATE/DELETE | `resourceIdArg`        | ID 作为参数传入    |
| 复杂操作      | `resourceIdPath`       | ID 在 DTO 对象内部 |

### 3. 敏感数据处理

UserAdapter 会自动排除敏感字段：

```typescript
async findById(id: string | number): Promise<any> {
  const user = await this.prisma.user.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      username: true,
      email: true,
      // 排除 password, refreshToken 等敏感字段
    },
  });
  return user;
}
```

### 4. 批量操作使用 batch 标记

```typescript
// ✅ 正确 - 为每条记录生成审计日志
@AuditLog({
  action: AuditAction.BATCH_DELETE,
  resource: AuditResource.role,
  resourceIdArg: 0,
  batch: true,
})
async batchDelete(ids: number[]): Promise<void> { }

// ❌ 错误 - 只会生成一条审计日志
@AuditLog({
  action: AuditAction.DELETE,
  resource: AuditResource.role,
  resourceIdArg: 0,
  // 缺少 batch: true
})
async batchDelete(ids: number[]): Promise<void> { }
```

### 5. 使用 condition 避免无意义的日志

```typescript
@AuditLog({
  action: AuditAction.UPDATE,
  resource: AuditResource.user,
  resourceIdArg: 0,
  // 只有实际修改了数据才记录
  condition: (args, result) => result.affected > 0,
})
async update(id: number, dto: UpdateDto): Promise<UpdateResult> { }
```

---

## 故障排查

### 问题 1: 审计日志未记录

**可能原因：**

1. 未注入 `AuditLogService`
2. `condition` 函数返回 `false`
3. 资源适配器未注册

**排查步骤：**

```typescript
// 检查控制台是否有警告
// [AuditLog] AuditLogService not injected in ...
```

### 问题 2: oldData 为空

**可能原因：**

1. 资源适配器未实现或未注册
2. `resourceIdArg` 或 `resourceIdPath` 配置错误
3. 资源在获取前已被删除

**排查步骤：**

```typescript
// 检查控制台错误日志
// [AuditLogService] Failed to resolve resource adapter: ...
```

### 问题 3: 批量操作只有一条日志

**原因：** 缺少 `batch: true` 配置

**解决：**

```typescript
@AuditLog({
  action: AuditAction.BATCH_DELETE,
  resource: AuditResource.role,
  resourceIdArg: 0,
  batch: true, // 添加此配置
})
```

---

## 当前已集成的审计点

### RolesService (6 个审计点)

| 方法              | 操作类型           | 说明           |
| ----------------- | ------------------ | -------------- |
| create            | CREATE             | 创建角色       |
| update            | UPDATE             | 更新角色       |
| remove            | DELETE             | 删除角色       |
| batchDelete       | BATCH_DELETE       | 批量删除角色   |
| assignPermissions | ASSIGN_PERMISSIONS | 为角色分配权限 |
| removePermissions | ASSIGN_PERMISSIONS | 移除角色权限   |

### PermissionsService (5 个审计点)

| 方法        | 操作类型     | 说明         |
| ----------- | ------------ | ------------ |
| create      | CREATE       | 创建权限     |
| update      | UPDATE       | 更新权限     |
| remove      | DELETE       | 删除权限     |
| batchDelete | BATCH_DELETE | 批量删除权限 |
| batchCreate | CREATE       | 批量创建权限 |

### UsersService (2 个审计点)

| 方法        | 操作类型     | 说明           |
| ----------- | ------------ | -------------- |
| assignRoles | ASSIGN_ROLES | 为用户分配角色 |
| removeRoles | REMOVE_ROLE  | 移除用户角色   |

---

## 下一步

- [日志系统使用指南](./logging.md) - 了解完整的日志系统
- [认证授权模块](./authentication.md) - JWT 认证机制
- [缓存系统使用指南](./cache.md) - RBAC 缓存策略

---
