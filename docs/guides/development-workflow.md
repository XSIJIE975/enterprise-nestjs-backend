# 开发工作流程

> 📌 **维护者**: XSIJIE | **最后更新**: 2025-11-03

> 日常开发的标准流程和最佳实践

## 日常开发流程

### 1. 启动开发环境

```bash
# 启动数据库和 Redis
pnpm docker:dev

# 启动开发服务器
pnpm start:dev
```

### 2. 创建新分支

```bash
# 从主分支创建功能分支
git checkout main
git pull origin main
git checkout -b feature/user-management
```

### 3. 开发功能

参考 [模块开发流程](#模块开发流程) 部分

### 4. 代码检查

```bash
# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

### 5. 提交代码

```bash
# 添加文件
git add .

# 提交(遵循 Conventional Commits 规范)
git commit -m "feat(users): add user profile update API"

# 推送到远程
git push origin feature/user-management
```

### 6. 创建 Pull Request

在 GitHub/GitLab 上创建 PR,等待 Code Review

---

## 模块开发流程

### 步骤 1: 生成模块骨架

```bash
# 使用 NestJS CLI 生成模块
nest g module modules/products
nest g controller modules/products
nest g service modules/products
```

生成的文件结构:

```text
src/modules/products/
├── products.module.ts
├── products.controller.ts
└── products.service.ts
```

### 步骤 2: 创建 DTO

创建数据传输对象用于请求验证:

```typescript
// src/modules/products/dto/create-product.dto.ts
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: '产品名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '产品描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '价格', minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: '库存', minimum: 0 })
  @IsNumber()
  @Min(0)
  stock: number;
}
```

```typescript
// src/modules/products/dto/update-product.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

### 步骤 3: 定义 Prisma Model

在 `prisma/models/` 下创建新的模型文件:

```prisma
// prisma/models/product.prisma
model Product {
  id          Int      @id @default(autoincrement())
  name        String   @db.VarChar(100)
  description String?  @db.Text
  price       Decimal  @db.Decimal(10, 2)
  stock       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("products")
}
```

### 步骤 4: 创建数据库迁移

```bash
# 创建迁移
pnpm prisma migrate dev --name add_products_table

# 生成 Prisma Client
pnpm db:generate
```

### 步骤 5: 实现 Service

```typescript
// src/modules/products/products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { LoggerService } from '@/shared/logger/logger.service';
import { CacheService } from '@/shared/cache/cache.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  private readonly CACHE_TTL = 300; // 5分钟

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateProductDto) {
    this.logger.log('Creating product', 'ProductsService');

    const product = await this.prisma.product.create({
      data: dto,
    });

    this.logger.logBusinessEvent({
      event: 'PRODUCT_CREATED',
      data: { productId: product.id },
    });

    return product;
  }

  async findAll() {
    const cacheKey = 'products:all';

    // 查缓存
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 查数据库
    const products = await this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 设置缓存
    await this.cache.set(cacheKey, products, this.CACHE_TTL);

    return products;
  }

  async findOne(id: number) {
    const cacheKey = `product:${id}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    await this.cache.set(cacheKey, product, this.CACHE_TTL);

    return product;
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id); // 验证存在性

    const product = await this.prisma.product.update({
      where: { id },
      data: dto,
    });

    // 清除缓存
    await this.cache.del(`product:${id}`);
    await this.cache.del('products:all');

    this.logger.logBusinessEvent({
      event: 'PRODUCT_UPDATED',
      data: { productId: id },
    });

    return product;
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.product.delete({
      where: { id },
    });

    await this.cache.del(`product:${id}`);
    await this.cache.del('products:all');

    this.logger.logBusinessEvent({
      event: 'PRODUCT_DELETED',
      data: { productId: id },
    });

    return { message: 'Product deleted successfully' };
  }
}
```

### 步骤 6: 实现 Controller

```typescript
// src/modules/products/products.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('产品管理')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '创建产品' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取产品列表' })
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取产品详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: '更新产品' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: '删除产品' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
```

### 步骤 7: 配置模块

```typescript
// src/modules/products/products.module.ts
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService], // 如果其他模块需要使用
})
export class ProductsModule {}
```

### 步骤 8: 在 AppModule 中注册

```typescript
// src/app.module.ts
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [
    // ... 其他模块
    ProductsModule,
  ],
})
export class AppModule {}
```

### 步骤 9: 测试 API

```bash
# 启动开发服务器
pnpm start:dev

# 访问 Swagger 文档
# http://localhost:3000/api/docs
```

使用 Swagger UI 或 Postman 测试 API:

```http
# 创建产品
POST http://localhost:3000/api/v1/products
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "name": "iPhone 15",
  "description": "最新款 iPhone",
  "price": 7999,
  "stock": 100
}

# 获取产品列表
GET http://localhost:3000/api/v1/products
Authorization: Bearer <your-token>

# 获取产品详情
GET http://localhost:3000/api/v1/products/1
Authorization: Bearer <your-token>

# 更新产品
PATCH http://localhost:3000/api/v1/products/1
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "price": 7499,
  "stock": 150
}

# 删除产品
DELETE http://localhost:3000/api/v1/products/1
Authorization: Bearer <your-token>
```

---

## 数据库操作流程

### 创建迁移

```bash
# 修改 schema 后创建迁移
pnpm prisma migrate dev --name <migration-name>

# 示例
pnpm prisma migrate dev --name add_products_table
pnpm prisma migrate dev --name add_user_avatar_field
```

### 查看迁移状态

```bash
pnpm prisma migrate status
```

### 重置数据库(开发环境)

```bash
# 重置数据库并重新运行所有迁移
pnpm db:migrate:reset

# 运行种子数据
pnpm db:seed
```

### 查看数据

```bash
# 打开 Prisma Studio
pnpm db:studio

# 访问 http://localhost:5555
```

---

## 调试技巧

### 1. 使用 VSCode 调试

创建 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["start:debug"],
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### 2. 查看日志

```bash
# 实时查看应用日志
tail -f logs/application-2025-10-05.log

# 查看错误日志
tail -f logs/error-2025-10-05.log
```

### 3. 查看数据库日志

通过 API 查询:

```http
GET http://localhost:3000/api/v1/logs/api?page=1&pageSize=20
Authorization: Bearer <your-token>
```

或直接查询数据库:

```sql
-- 查看最近的 API 请求
SELECT * FROM api_logs ORDER BY createdAt DESC LIMIT 20;

-- 查看错误日志
SELECT * FROM error_logs ORDER BY createdAt DESC LIMIT 20;

-- 根据 requestId 追踪
SELECT * FROM api_logs WHERE requestId = 'xxx-xxx-xxx';
```

---

## 常见任务

### 添加新的环境变量

1. 在 `.env` 中添加变量
2. 在 `config/*.config.ts` 中定义配置
3. 使用 `ConfigService` 读取

```typescript
// config/app.config.ts
export default registerAs('app', () => ({
  newFeature: {
    enabled: process.env.NEW_FEATURE_ENABLED === 'true',
    apiKey: process.env.NEW_FEATURE_API_KEY,
  },
}));

// 使用
constructor(private readonly configService: ConfigService) {}

const enabled = this.configService.get('app.newFeature.enabled');
```

### 添加新的守卫

```typescript
// common/guards/feature-flag.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    return this.configService.get('app.newFeature.enabled');
  }
}

// 使用
@UseGuards(FeatureFlagGuard)
@Get('new-feature')
newFeature() {
  return 'This is a new feature';
}
```

### 添加新的拦截器

```typescript
// common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

// 在 AppModule 中注册为全局拦截器
{
  provide: APP_INTERCEPTOR,
  useClass: TransformInterceptor,
}
```

---

## 性能优化建议

### 1. 使用缓存

对频繁查询的数据使用 Redis 缓存:

```typescript
async findOne(id: number) {
  const cacheKey = `user:${id}`;

  const cached = await this.cache.get(cacheKey);
  if (cached) return cached;

  const user = await this.prisma.user.findUnique({ where: { id } });
  await this.cache.set(cacheKey, user, 300);

  return user;
}
```

### 2. 数据库查询优化

```typescript
// ✅ 只查询需要的字段
const user = await this.prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true,
  },
});

// ✅ 使用批量查询
const users = await this.prisma.user.findMany({
  where: {
    id: { in: [1, 2, 3, 4, 5] },
  },
});

// ✅ 使用分页
const users = await this.prisma.user.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
});
```

### 3. 并行执行

```typescript
// ✅ 使用 Promise.all 并行执行
const [user, orders, profile] = await Promise.all([
  this.prisma.user.findUnique({ where: { id } }),
  this.prisma.order.findMany({ where: { userId: id } }),
  this.prisma.profile.findUnique({ where: { userId: id } }),
]);
```

### 4. 配置管理最佳实践

项目采用命名空间模式统一管理配置，所有配置通过 `src/config/` 目录下的模块定义。

**配置模块结构：**

```plaintext
src/config/
├── index.ts              # 统一导出
├── app.config.ts         # 应用核心配置
├── database.config.ts    # 数据库配置
├── redis.config.ts       # Redis 配置
├── jwt.config.ts         # JWT 配置
├── security.config.ts    # 安全配置
├── throttle.config.ts    # 限流配置
├── upload.config.ts      # 上传配置
└── mail.config.ts        # 邮件配置
```

**读取配置的正确方式：**

```typescript
// ✅ 推荐：使用命名空间访问
const port = this.configService.get('app.port', 3000);
const dbUrl = this.configService.get('database.url');
const jwtSecret = this.configService.get('jwt.accessTokenSecret');
const bcryptRounds = this.configService.get('security.bcrypt.rounds', 10);

// ❌ 不推荐：直接访问环境变量
const port = this.configService.get('PORT', 3000);
const dbUrl = this.configService.get('DATABASE_URL');
```

**优势：**

- ✅ 更好的类型安全和代码补全
- ✅ 配置结构清晰，易于维护
- ✅ 支持默认值和配置验证
- ✅ 遵循 NestJS 最佳实践

**添加新配置：**

1. 在对应的 config 文件中添加环境变量读取
2. 使用 `registerAs('namespace', () => ({ ... }))` 导出
3. 在 `app.module.ts` 的 `ConfigModule.forRoot()` 中加载
4. 通过 `configService.get('namespace.property')` 访问

详细配置说明请参考各配置模块的源码注释。

---

## 下一步

- [编码规范](./coding-standards.md)
- [快速开始指南](./getting-started.md)
- [日志系统使用指南](../modules/logging.md)
- [认证授权模块](../modules/authentication.md)

---
