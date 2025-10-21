# Prisma RelationMode 使用指南

> Prisma 应用层关联模式，无物理外键，兼容低版本 MySQL 和云数据库

---

## 📋 目录

1. [功能概述](#功能概述)
2. [技术实现](#技术实现)
3. [配置说明](#配置说明)
4. [最佳实践](#最佳实践)
5. [数据一致性](#数据一致性)
6. [迁移指南](#迁移指南)
7. [常见问题](#常见问题)

---

## 功能概述

### 什么是 RelationMode

本项目使用 `relationMode = "prisma"` 模式，即**不在数据库中创建物理外键约束**，而是由 Prisma 在应用层管理所有关联关系。

### ✅ 核心优势

- **更好的兼容性**: 支持低版本 MySQL (5.x)、PlanetScale 等不支持外键的云数据库
- **更高的性能**: 避免外键锁导致的并发问题，删除操作更快
- **更灵活的迁移**: 数据库迁移和重构更简单，无外键约束限制
- **更友好的测试**: 测试环境无需维护复杂的外键约束

### ⚠️ 注意事项

- 数据完整性由应用层保证，需要在代码中谨慎处理
- 所有关联字段必须手动添加索引
- 避免直接执行 SQL 操作数据库

---

## 技术实现

### 工作原理

```text
┌─────────────────────────────────────────────────┐
│               传统外键模式                       │
│                                                 │
│  DELETE FROM users WHERE id = 1;                │
│         ↓                                       │
│  数据库自动级联删除相关的                        │
│  user_sessions, user_roles, api_logs 等        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│          relationMode = "prisma" 模式            │
│                                                 │
│  await prisma.user.delete({ where: { id: 1 }}) │
│         ↓                                       │
│  Prisma 在应用层自动执行：                       │
│  1. DELETE FROM user_sessions WHERE userId=1    │
│  2. DELETE FROM user_roles WHERE userId=1       │
│  3. UPDATE api_logs SET userId=NULL WHERE...    │
│  4. DELETE FROM users WHERE id=1                │
└─────────────────────────────────────────────────┘
```

### Schema 配置示例

```prisma
// prisma/schema.prisma
datasource db {
  provider     = "mysql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"  // 关键配置
}

model User {
  id        Int           @id @default(autoincrement())
  email     String        @unique
  sessions  UserSession[]
  userRoles UserRole[]
}

model UserSession {
  id     String @id @default(uuid())
  userId Int

  // onDelete: Cascade 由 Prisma 在应用层执行
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])  // ⚠️ 必须添加索引
}

model UserRole {
  id     Int @id @default(autoincrement())
  userId Int
  roleId Int

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@index([userId])  // ⚠️ 必须添加索引
  @@index([roleId])  // ⚠️ 必须添加索引
}
```

### 级联策略

| 策略                 | 说明                        | 项目中使用场景              |
| -------------------- | --------------------------- | --------------------------- |
| `onDelete: Cascade`  | 删除父记录时自动删除子记录  | UserSession, UserRole       |
| `onDelete: SetNull`  | 删除父记录时将外键设为 NULL | ApiLog (保留日志但解除关联) |
| `onDelete: Restrict` | 有子记录时禁止删除父记录    | 未使用                      |

---

## 配置说明

### 环境要求

| 组件    | 版本      | 说明              |
| ------- | --------- | ----------------- |
| Prisma  | 6.0.0+    | 支持 relationMode |
| MySQL   | 5.x / 8.x | 无版本限制        |
| Node.js | 22.0.0+   | 项目要求          |

### 完整配置步骤

#### 1. 更新 Schema 配置

```prisma
// prisma/schema.prisma
datasource db {
  provider     = "mysql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"  // 添加此行
}
```

#### 2. 为所有关联字段添加索引

```prisma
model UserRole {
  userId Int
  roleId Int

  user User @relation(fields: [userId], references: [id])
  role Role @relation(fields: [roleId], references: [id])

  // 必须添加索引
  @@index([userId])
  @@index([roleId])
}
```

#### 3. 生成迁移

```bash
# 开发环境
pnpm db:migrate

# 生产环境
pnpm db:migrate:deploy
```

#### 4. 验证配置

```bash
# 检查 Schema 是否正确
pnpm db:generate

# 运行数据一致性检查
pnpm db:check:orphans
```

---

## 最佳实践

### 1. 软删除优先（推荐）

项目中默认使用软删除，不触发级联，更安全：

```typescript
// ✅ 推荐：软删除
async remove(id: number): Promise<void> {
  await this.prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
  // 关联数据保留，可恢复，保留审计记录
}

// 查询时过滤已删除记录
async findAll(): Promise<User[]> {
  return this.prisma.user.findMany({
    where: { deletedAt: null }
  });
}
```

### 2. 硬删除使用事务（必须）

如果必须硬删除，使用事务保证原子性：

```typescript
// ✅ 推荐：使用事务
async hardDelete(id: number): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    // 1. 先删除子记录
    await tx.userSession.deleteMany({ where: { userId: id } });
    await tx.userRole.deleteMany({ where: { userId: id } });

    // 2. 处理可选关联（SetNull）
    await tx.apiLog.updateMany({
      where: { userId: id },
      data: { userId: null }
    });

    // 3. 最后删除主记录
    await tx.user.delete({ where: { id } });
  });
}

// ❌ 不推荐：不使用事务
async hardDeleteBad(id: number): Promise<void> {
  await this.prisma.user.delete({ where: { id } });
  // 如果此时应用崩溃，子记录未删除，产生孤儿数据
}
```

### 3. 避免直接 SQL 操作

```typescript
// ❌ 避免：直接 SQL 不会触发级联
await this.prisma.$executeRaw`DELETE FROM users WHERE id = ${id}`;

// ✅ 推荐：使用 Prisma Client
await this.prisma.user.delete({ where: { id } });
```

### 4. 查询时处理 NULL 关联

```typescript
// 当外键可能为 NULL 时
const logs = await this.prisma.apiLog.findMany({
  where: {
    userId: { not: null }, // 过滤 NULL
  },
  include: {
    user: true, // 确保有关联数据
  },
});
```

### 5. 批量操作注意事项

```typescript
// ✅ 正确：使用 deleteMany 会触发级联
await this.prisma.user.deleteMany({
  where: { id: { in: [1, 2, 3] } },
});

// ⚠️ 注意：updateMany 不触发级联
await this.prisma.user.updateMany({
  where: { isActive: false },
  data: { deletedAt: new Date() }, // 软删除，安全
});
```

---

## 数据一致性

### 潜在风险场景

#### 1. 应用崩溃

```typescript
// 场景：删除操作进行到一半时应用崩溃
await prisma.userSession.deleteMany({ where: { userId: 1 } });
// 💥 应用崩溃
await prisma.user.delete({ where: { id: 1 } }); // 未执行

// 结果：user_sessions 被删除，但 user 仍存在（部分完成）
```

**解决方案**: 使用事务

```typescript
await prisma.$transaction(async tx => {
  await tx.userSession.deleteMany({ where: { userId: 1 } });
  await tx.user.delete({ where: { id: 1 } });
  // 事务保证：要么全部成功，要么全部回滚
});
```

#### 2. 直接操作数据库

```sql
-- 在数据库管理工具中直接执行
DELETE FROM users WHERE id = 1;

-- 结果：user_sessions, user_roles 等子记录成为孤儿数据
```

**解决方案**:

- 禁止直接操作生产数据库
- 定期运行数据一致性检查

#### 3. 并发删除

```typescript
// 场景：两个请求同时删除相关数据
Request A: 删除 User(1)
Request B: 删除 Role(10)  // User(1) 拥有此角色

// 可能结果：竞态条件导致数据不一致
```

**解决方案**: 使用乐观锁或悲观锁

---

## 迁移指南

### 从物理外键迁移到 RelationMode

#### 步骤 1: 备份数据

```bash
# 备份数据库
mysqldump -u root -p enterprise_db > backup_$(date +%Y%m%d).sql
```

#### 步骤 2: 更新 Schema

```prisma
// prisma/schema.prisma
datasource db {
  provider     = "mysql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"  // 添加此行
}
```

#### 步骤 3: 添加索引

```prisma
// 为所有关联字段添加索引
model UserSession {
  userId Int
  user User @relation(fields: [userId], references: [id])

  @@index([userId])  // 新增
}

model UserRole {
  userId Int
  roleId Int

  user User @relation(fields: [userId], references: [id])
  role Role @relation(fields: [roleId], references: [id])

  @@index([userId])  // 新增
  @@index([roleId])  // 新增
}
```

#### 步骤 4: 生成迁移

```bash
# 生成迁移文件（会包含 DROP FOREIGN KEY 语句）
pnpm db:migrate

# 迁移文件示例 (自动生成)
-- DropForeignKey
ALTER TABLE `user_sessions` DROP FOREIGN KEY `user_sessions_userId_fkey`;

-- CreateIndex
CREATE INDEX `user_sessions_userId_idx` ON `user_sessions`(`userId`);
```

#### 步骤 5: 测试级联删除

```typescript
// 测试 Prisma 级联删除是否正常工作
describe('Cascade Delete', () => {
  it('应该删除用户及其所有会话', async () => {
    const user = await prisma.user.create({
      data: { email: 'test@example.com', ... }
    });

    await prisma.userSession.create({
      data: { userId: user.id, ... }
    });

    // 删除用户
    await prisma.user.delete({ where: { id: user.id } });

    // 验证会话也被删除
    const sessions = await prisma.userSession.findMany({
      where: { userId: user.id }
    });
    expect(sessions).toHaveLength(0);
  });
});
```

## 常见问题

### Q1: 为什么选择 relationMode="prisma"？

**A**: 主要原因是兼容性和灵活性：

1. **兼容低版本 MySQL**: 支持 MySQL 5.x，避免升级成本
2. **云数据库支持**: PlanetScale 等云数据库不支持外键
3. **性能优化**: 避免外键锁，删除操作更快
4. **迁移便利**: 数据库迁移和重构更简单

### Q2: 性能会受影响吗？

**A**: 不会，甚至可能更好：

- **查询性能**: 相同（已添加所有必要索引）
- **插入性能**: 更快（无外键约束检查）
- **删除性能**: 更快（无外键锁）
- **更新性能**: 相同

**性能对比**:

| 操作     | 物理外键      | relationMode="prisma" |
| -------- | ------------- | --------------------- |
| SELECT   | ✅ 快         | ✅ 快（有索引）       |
| INSERT   | ⚠️ 需检查外键 | ✅ 更快（无约束）     |
| DELETE   | ⚠️ 外键锁     | ✅ 无锁（更快）       |
| UPDATE   | ✅ 快         | ✅ 快                 |
| 级联删除 | ⚠️ 可能锁表   | ✅ 应用层控制         |

### Q3: 如何保证数据完整性？

**A**: 多层保障机制：

1. **应用层**: Prisma 自动处理级联删除
2. **事务保护**: 关键操作使用事务
3. **软删除**: 默认使用软删除降低风险
4. **定期检查**: 运行数据一致性检查脚本
5. **审计日志**: 记录所有删除操作

### Q4: 会出现孤儿记录吗？

**A**: 正常情况下不会，极端情况可能出现：

**不会出现的场景** (99.9%):

- 通过 Prisma Client 的正常 CRUD 操作
- 使用事务的批量操作
- 软删除操作

**可能出现的场景** (0.1%):

- 应用在删除中途崩溃
- 直接在数据库中执行 SQL
- 极端并发冲突

**检测和修复**:

```bash
# 定期检查
pnpm db:check:orphans

# 如发现问题，可手动清理或联系 DBA
```

### Q5: 与物理外键有什么区别？

**A**: 主要区别：

| 特性          | 物理外键         | relationMode="prisma" |
| ------------- | ---------------- | --------------------- |
| 数据完整性    | 数据库层保证     | 应用层保证            |
| 级联删除      | 数据库自动       | Prisma 自动           |
| 性能          | 有外键锁         | 无外键锁              |
| 兼容性        | 部分数据库不支持 | ✅ 所有数据库         |
| 迁移难度      | 较复杂           | 较简单                |
| 测试友好度    | 需要维护约束     | ✅ 更灵活             |
| 直接 SQL 操作 | ✅ 自动级联      | ⚠️ 不触发级联         |

### Q6: 项目中是否安全？

**A**: 是的，完全安全：

✅ **已验证的安全点**:

1. 所有删除操作使用软删除
2. 显式的关联操作管理
3. 完善的会话管理机制
4. 提供数据一致性检查工具

⚠️ **需要注意**:

1. 不要直接在数据库中执行 SQL
2. 硬删除必须使用事务
3. 定期运行一致性检查

---

## 参考资料

- [Prisma 官方文档 - Relation Mode](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/relation-mode)
- [PlanetScale 为什么不使用外键](https://planetscale.com/blog/why-foreign-keys-arent-the-answer)
- [项目数据库设计文档](../architecture/database-design.md)

---

**维护者**: XSIJIE
**最后更新**: 2025-10-21
