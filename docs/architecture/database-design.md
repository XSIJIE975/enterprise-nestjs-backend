# 数据库设计规范

> 📌 **维护者**: XSIJIE | **最后更新**: 2025-11-03

> Prisma + MySQL 数据库设计最佳实践

## 表设计规范

### 命名规范

#### 表名

- 使用复数形式
- 小写 + 下划线分隔
- 有意义的业务名称

```prisma
✅ 正确:
model User {
  @@map("users")
}

model OrderItem {
  @@map("order_items")
}

❌ 错误:
model User {
  @@map("user")  // 应该用复数
}

model orderItem {
  @@map("orderItem")  // 应该用下划线
}
```

#### 字段名

- 小写驼峰命名
- 布尔字段使用 `is`, `has`, `can` 前缀
- 时间字段使用 `At` 后缀

```prisma
model User {
  id          Int       @id @default(autoincrement())
  email       String    @unique
  firstName   String
  lastName    String
  isActive    Boolean   @default(true)
  isVerified  Boolean   @default(false)
  lastLoginAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
}
```

---

## 字段类型规范

### 常用类型映射

| Prisma 类型       | MySQL 类型 | 使用场景         |
| ----------------- | ---------- | ---------------- |
| `String`          | VARCHAR    | 短文本(默认 191) |
| `String @db.Text` | TEXT       | 长文本           |
| `Int`             | INT        | 整数             |
| `BigInt`          | BIGINT     | 大整数           |
| `Float`           | DOUBLE     | 浮点数           |
| `Decimal`         | DECIMAL    | 精确小数(金额)   |
| `Boolean`         | TINYINT(1) | 布尔值           |
| `DateTime`        | DATETIME   | 日期时间         |
| `Json`            | JSON       | JSON 数据        |

### 字段长度规范

```prisma
model User {
  // 邮箱: 100字符
  email       String   @db.VarChar(100)

  // 用户名: 50字符
  username    String   @db.VarChar(50)

  // 密码哈希: 255字符
  password    String   @db.VarChar(255)

  // 手机号: 20字符
  phone       String?  @db.VarChar(20)

  // 长文本: TEXT
  description String?  @db.Text

  // 金额: DECIMAL(10, 2)
  balance     Decimal  @default(0) @db.Decimal(10, 2)
}
```

---

## 索引设计

### 主键

```prisma
model User {
  // 自增主键(推荐)
  id Int @id @default(autoincrement())
}

model Session {
  // UUID 主键
  id String @id @default(uuid())
}
```

### 唯一索引

```prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  phone String @unique

  // 复合唯一索引
  @@unique([firstName, lastName])
}
```

### 普通索引

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  username  String
  isActive  Boolean
  createdAt DateTime @default(now())

  // 单字段索引
  @@index([username])
  @@index([isActive])

  // 复合索引
  @@index([isActive, createdAt])
}
```

---

## 关系设计

### 一对一关系

```prisma
model User {
  id      Int      @id @default(autoincrement())
  email   String   @unique
  profile Profile?
}

model Profile {
  id     Int    @id @default(autoincrement())
  userId Int    @unique
  bio    String @db.Text
  avatar String?
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 一对多关系

```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  posts Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  userId   Int
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

### 多对多关系

```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  roles UserRole[]
}

model Role {
  id    Int        @id @default(autoincrement())
  name  String     @unique
  users UserRole[]
}

// 中间表
model UserRole {
  userId    Int
  roleId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@id([userId, roleId])
  @@index([userId])
  @@index([roleId])
  @@map("user_roles")
}
```

---

## 级联操作

### OnDelete 选项

```prisma
model User {
  id    Int     @id @default(autoincrement())
  posts Post[]
}

model Post {
  id     Int  @id @default(autoincrement())
  userId Int

  // Cascade: 删除用户时删除所有文章
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Restrict: 如果有文章则不允许删除用户
  // user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  // SetNull: 删除用户时将 userId 设为 null
  // user User @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```

---

## 软删除设计

```prisma
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  isActive  Boolean   @default(true)
  deletedAt DateTime?

  @@index([deletedAt])
  @@map("users")
}
```

使用示例:

```typescript
// 软删除
await prisma.user.update({
  where: { id: userId },
  data: {
    isActive: false,
    deletedAt: new Date(),
  },
});

// 查询时排除已删除的
const users = await prisma.user.findMany({
  where: {
    deletedAt: null,
  },
});
```

---

## 枚举类型

```prisma
enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  DELETED
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}

model User {
  id     Int        @id @default(autoincrement())
  email  String     @unique
  status UserStatus @default(ACTIVE)
}

model Order {
  id     Int         @id @default(autoincrement())
  status OrderStatus @default(PENDING)
}
```

---

## 时间戳字段

每个表都应包含以下时间字段:

```prisma
model BaseModel {
  id        Int       @id @default(autoincrement())
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
}
```

---

## 完整示例

```prisma
// 用户表
model User {
  id            Int       @id @default(autoincrement())
  email         String    @unique @db.VarChar(100)
  password      String    @db.VarChar(255)
  username      String    @unique @db.VarChar(50)
  firstName     String?   @db.VarChar(50)
  lastName      String?   @db.VarChar(50)
  phone         String?   @unique @db.VarChar(20)
  avatar        String?   @db.VarChar(255)
  isActive      Boolean   @default(true)
  isVerified    Boolean   @default(false)
  lastLoginAt   DateTime?
  lastLoginIp   String?   @db.VarChar(45)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  // 关联
  profile       Profile?
  roles         UserRole[]
  orders        Order[]
  refreshTokens RefreshToken[]

  // 索引
  @@index([email])
  @@index([username])
  @@index([isActive])
  @@index([deletedAt])
  @@map("users")
}

// 用户资料表
model Profile {
  id        Int      @id @default(autoincrement())
  userId    Int      @unique
  bio       String?  @db.Text
  birthday  DateTime?
  gender    String?  @db.VarChar(10)
  address   String?  @db.VarChar(255)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_profiles")
}

// 订单表
model Order {
  id          Int         @id @default(autoincrement())
  orderNo     String      @unique @db.VarChar(32)
  userId      Int
  totalAmount Decimal     @db.Decimal(10, 2)
  status      OrderStatus @default(PENDING)
  paidAt      DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user  User        @relation(fields: [userId], references: [id], onDelete: Restrict)
  items OrderItem[]

  @@index([userId])
  @@index([orderNo])
  @@index([status])
  @@index([createdAt])
  @@map("orders")
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}
```

---

## 迁移最佳实践

### 1. 创建迁移

```bash
# 开发环境: 自动创建并应用
pnpm prisma migrate dev --name add_user_phone

# 生产环境: 仅生成 SQL
pnpm prisma migrate deploy
```

### 2. 查看状态

```bash
pnpm prisma migrate status
```

### 3. 重置(仅开发环境)

```bash
pnpm prisma migrate reset
```

### 4. 迁移文件命名

使用描述性名称:

```text
✅ 好的命名:
- add_user_phone_field
- create_orders_table
- add_user_email_index
- update_order_status_enum

❌ 不好的命名:
- migration_1
- update
- changes
```

---

## 性能优化

### 1. 使用索引

```prisma
model User {
  email String @unique

  // 经常用于查询的字段添加索引
  @@index([email])
  @@index([isActive])
  @@index([createdAt])
}
```

### 2. 只查询需要的字段

```typescript
// ❌ 查询所有字段
const user = await prisma.user.findUnique({
  where: { id },
});

// ✅ 只查询需要的字段
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    username: true,
  },
});
```

### 3. 使用分页

```typescript
const users = await prisma.user.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' },
});
```

### 4. 使用事务

```typescript
await prisma.$transaction(async tx => {
  await tx.user.update({
    where: { id: 1 },
    data: { balance: { decrement: 100 } },
  });
  await tx.user.update({
    where: { id: 2 },
    data: { balance: { increment: 100 } },
  });
});
```

---

## 下一步

- [开发工作流程](../guides/development-workflow.md)
- [架构概览](./overview.md)

---
