# 编码规范

> 📌 **维护者**: XSIJIE | **最后更新**: 2025-11-03

> NestJS TypeScript 项目的编码标准和最佳实践

## 命名规范

### 文件命名

所有文件名使用 **kebab-case**(小写 + 连字符):

```text
✅ 正确:
- user.service.ts
- create-user.dto.ts
- jwt-auth.guard.ts
- http-exception.filter.ts

❌ 错误:
- UserService.ts
- createUserDTO.ts
- JwtAuthGuard.ts
```

### 类命名

使用 **PascalCase**(大驼峰):

```typescript
✅ 正确:
export class UsersService { }
export class CreateUserDto { }
export class JwtAuthGuard { }

❌ 错误:
export class usersService { }
export class createUserDto { }
```

### 变量和函数命名

使用 **camelCase**(小驼峰):

```typescript
✅ 正确:
const userId = 123;
const userName = 'John';
async function findUserById(id: number) { }

❌ 错误:
const user_id = 123;
const UserName = 'John';
async function FindUserById(id: number) { }
```

### 常量命名

使用 **UPPER_SNAKE_CASE**(大写 + 下划线):

```typescript
✅ 正确:
export const MAX_LOGIN_ATTEMPTS = 5;
export const JWT_SECRET_KEY = 'secret';
export const DEFAULT_PAGE_SIZE = 20;

❌ 错误:
export const maxLoginAttempts = 5;
export const jwtSecretKey = 'secret';
```

### 接口和类型命名

- **接口**: PascalCase, 可选 `I` 前缀
- **类型**: PascalCase, 可选 `T` 前缀

```typescript
✅ 推荐:
export interface User { }
export interface IUser { }
export type UserRole = 'admin' | 'user';

❌ 不推荐:
export interface user { }
export interface iUser { }
```

---

## 代码组织规范

### 类成员顺序

```typescript
@Injectable()
export class UsersService {
  // 1. 静态成员
  private static readonly DEFAULT_LIMIT = 20;

  // 2. 类属性
  private readonly logger = new Logger(UsersService.name);

  // 3. 构造函数
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // 4. 生命周期钩子
  onModuleInit() {
    // ...
  }

  // 5. 公共方法
  async findAll(query: QueryDto) {
    // ...
  }

  async findOne(id: number) {
    // ...
  }

  async create(createUserDto: CreateUserDto) {
    // ...
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // ...
  }

  async remove(id: number) {
    // ...
  }

  // 6. 私有方法
  private async hashPassword(password: string): Promise<string> {
    // ...
  }

  private validateEmail(email: string): boolean {
    // ...
  }
}
```

### 模块导入顺序

```typescript
// 1. Node.js 内置模块
import { join } from 'path';
import { readFileSync } from 'fs';

// 2. 第三方库
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

// 3. 项目内部模块 - 绝对路径导入
import { PrismaService } from '@/shared/database/prisma.service';
import { CacheService } from '@/shared/cache/cache.service';
import { LoggerService } from '@/shared/logger/logger.service';

// 4. 相对路径导入
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
```

---

## TypeScript 规范

### 类型定义

```typescript
// ❌ 不推荐: 使用 any
function processData(data: any) {
  return data.value;
}

// ✅ 推荐: 明确类型
function processData(data: { value: string }): string {
  return data.value;
}

// ✅ 推荐: 使用接口或类型
interface UserData {
  id: number;
  name: string;
  email: string;
}

function processUser(user: UserData): string {
  return user.name;
}
```

### 函数返回类型

```typescript
// ❌ 不推荐: 省略返回类型
async function getUser(id: number) {
  return this.prisma.user.findUnique({ where: { id } });
}

// ✅ 推荐: 明确返回类型
async function getUser(id: number): Promise<User | null> {
  return this.prisma.user.findUnique({ where: { id } });
}
```

### 可选链和空值合并

```typescript
// ✅ 推荐: 使用可选链
const userName = user?.profile?.name;

// ✅ 推荐: 使用空值合并
const displayName = userName ?? 'Anonymous';

// ❌ 不推荐: 传统方式
const userName = user && user.profile && user.profile.name;
const displayName = userName || 'Anonymous'; // || 会将 '' 和 0 视为 falsy
```

---

## 异步处理规范

### 错误处理

```typescript
// ✅ 推荐: 使用 try-catch
async findOne(id: number): Promise<User> {
  try {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  } catch (error) {
    this.logger.error(`Failed to find user #${id}`, error.stack);
    throw error;
  }
}

// ❌ 不推荐: 不处理错误
async findOne(id: number): Promise<User> {
  const user = await this.prisma.user.findUnique({ where: { id } });
  return user;
}
```

### Promise 使用

```typescript
// ✅ 推荐: 使用 Promise.all 并行执行
async getUserWithDetails(id: number) {
  const [user, orders, posts] = await Promise.all([
    this.prisma.user.findUnique({ where: { id } }),
    this.prisma.order.findMany({ where: { userId: id } }),
    this.prisma.post.findMany({ where: { userId: id } }),
  ]);

  return { user, orders, posts };
}

// ❌ 不推荐: 串行执行
async getUserWithDetails(id: number) {
  const user = await this.prisma.user.findUnique({ where: { id } });
  const orders = await this.prisma.order.findMany({ where: { userId: id } });
  const posts = await this.prisma.post.findMany({ where: { userId: id } });

  return { user, orders, posts };
}
```

---

## 注释规范

### JSDoc 注释

```typescript
/**
 * 用户服务
 * 处理用户相关的业务逻辑
 */
@Injectable()
export class UsersService {
  /**
   * 根据 ID 查找用户
   *
   * @param id - 用户 ID
   * @returns 用户对象,如果不存在则抛出 NotFoundException
   * @throws {NotFoundException} 当用户不存在时
   *
   * @example
   * const user = await usersService.findOne(1);
   */
  async findOne(id: number): Promise<User> {
    // ...
  }
}
```

### 代码注释

```typescript
// ✅ 推荐: 解释为什么这样做
// 使用缓存减少数据库查询,缓存时间设置为 5 分钟
const cacheKey = `user:${id}`;
const cached = await this.cacheService.get(cacheKey);

// ✅ 推荐: 标记待办事项
// TODO: 添加分页功能
// FIXME: 修复并发更新问题
// NOTE: 这里使用软删除而不是硬删除

// ❌ 不推荐: 描述代码本身
// 定义一个变量
const user = await this.findOne(id);
```

---

## Git 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范:

### 格式

```text
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型 (type)

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式(不影响代码运行的变动)
- `refactor`: 重构(既不是新增功能,也不是修改bug)
- `perf`: 性能优化
- `test`: 增加测试
- `chore`: 构建过程或辅助工具的变动
- `ci`: CI/CD 相关

### 示例

```bash
# 新功能
feat(auth): add two-factor authentication

# 修复 bug
fix(users): resolve user profile update issue

# 文档更新
docs(readme): update installation instructions

# 重构
refactor(logger): improve logging performance

# 性能优化
perf(cache): optimize cache invalidation strategy
```

---

## 最佳实践

### 1. 使用依赖注入

```typescript
// ✅ 推荐
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}
}

// ❌ 不推荐
@Injectable()
export class UsersService {
  private prisma = new PrismaService();
  private logger = new LoggerService();
}
```

### 2. 使用 DTO 验证

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: '邮箱地址' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '密码', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
```

### 3. 使用装饰器简化代码

```typescript
// ✅ 使用自定义装饰器
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  @Get('me')
  @Roles('admin', 'user')
  getProfile(@CurrentUser() user: User) {
    return user;
  }
}
```

### 4. 合理使用缓存

```typescript
async findOne(id: number): Promise<User> {
  const cacheKey = `user:${id}`;

  // 先查缓存
  const cached = await this.cache.get<User>(cacheKey);
  if (cached) {
    return cached;
  }

  // 查数据库
  const user = await this.prisma.user.findUnique({ where: { id } });

  // 设置缓存
  if (user) {
    await this.cache.set(cacheKey, user, 300); // 5分钟
  }

  return user;
}
```

### 5. 记录日志

```typescript
async create(dto: CreateUserDto): Promise<User> {
  this.logger.log('Creating new user', 'UsersService');

  try {
    const user = await this.prisma.user.create({ data: dto });

    this.logger.logBusinessEvent({
      event: 'USER_CREATED',
      data: { userId: user.id },
    });

    return user;
  } catch (error) {
    this.logger.error('Failed to create user', error.stack);
    throw error;
  }
}
```

### 6. 使用事务

```typescript
async transferMoney(fromId: number, toId: number, amount: number) {
  return this.prisma.$transaction(async (tx) => {
    // 扣款
    await tx.account.update({
      where: { id: fromId },
      data: { balance: { decrement: amount } },
    });

    // 入账
    await tx.account.update({
      where: { id: toId },
      data: { balance: { increment: amount } },
    });

    // 记录日志
    await tx.transactionLog.create({
      data: { fromId, toId, amount },
    });
  });
}
```

---

## 代码质量工具

### ESLint

项目已配置 ESLint,执行检查:

```bash
# 检查代码
pnpm lint

# 自动修复
pnpm lint:fix
```

### Prettier

格式化代码:

```bash
# 格式化代码
pnpm format

# 检查格式
pnpm format:check
```

### TypeScript

类型检查:

```bash
# 类型检查
pnpm type-check
```

---

## 下一步

- [开发工作流程](./development-workflow.md)
- [模块开发指南](./development-workflow.md#模块开发流程)
- [架构概览](../architecture/overview.md)

---
