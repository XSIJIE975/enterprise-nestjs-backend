# Swagger 响应装饰器使用指南

> 📌 **维护者**: XSIJIE | **最后更新**: 2025-11-04

## 概述

提供两个 Swagger 装饰器来解决 OpenAPI 泛型类型显示问题：

1. **`ApiSuccessResponseDecorator`** - 用于成功响应（200）
2. **`ApiErrorResponseDecorator`** - 用于错误响应（4xx/5xx）

这些装饰器使用 `ApiExtraModels` 和 `getSchemaPath` 来在 Swagger Schema 中正确建立引用关系。

## 原理

问题在于：TypeScript 的泛型在运行时会被擦除，导致 Swagger 无法从类型中推断出 `data` 字段的具体类型。

解决方案：

- 使用 `ApiExtraModels(ApiSuccessResponse, DataType)` 注册两个模型
- 使用 `allOf` 和 `$ref` 组合来创建引用关系
- 这样 Swagger 就能显示完整的响应 Schema

```typescript
{
  allOf: [
    { $ref: '#/components/schemas/ApiSuccessResponse' },
    {
      properties: {
        data: {
          $ref: '#/components/schemas/YourDataType',
        },
      },
    },
  ];
}
```

## 使用方式

### 基本用法

对于返回单个对象的端点：

```typescript
import { ApiSuccessResponseDecorator } from '@/common/decorators/swagger-response.decorator';

@Controller('users')
export class UsersController {
  /**
   * 获取用户详情
   */
  @ApiOperation({ summary: '获取用户详情' })
  @ApiSuccessResponseDecorator(UserResponseDto, '获取成功')
  @ApiResponse({ status: 404, description: '用户不存在' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }
}
```

### 分页响应

对于返回分页数据的端点：

```typescript
/**
 * 获取用户列表
 */
@ApiOperation({ summary: '获取用户列表' })
@ApiSuccessResponseDecorator(PaginatedUsersDto, '查询成功')
@Get()
findAll(@Query() query: QueryUsersDto): Promise<PaginatedUsersDto> {
  return this.usersService.findAll(query);
}
```

### 创建资源

对于 POST 端点（状态码为 201）：

```typescript
/**
 * 创建项目
 */
@ApiOperation({ summary: '创建项目' })
@ApiSuccessResponseDecorator(ProjectResponseDto, '项目创建成功')
@ApiResponse({ status: 409, description: '项目名称已存在' })
@Post()
create(@Body() createDto: CreateProjectDto): Promise<ProjectResponseDto> {
  return this.projectsService.create(createDto);
}
```

注意：装饰器默认使用 200 状态码。如果需要自定义，可以在装饰器前面添加 `@ApiCreatedResponse()` 或通过其他方式指定。

## 装饰器签名

### ApiSuccessResponseDecorator

用于处理成功的 API 响应（HTTP 200）

```typescript
export const ApiSuccessResponseDecorator = <TModel extends Type<any>>(
  model: TModel,
  description: string = '查询成功',
) => MethodDecorator;
```

**参数：**

- `model`: 响应数据的类型（必需）。例如：`UserResponseDto`、`PaginatedUsersDto`
- `description`: 响应的描述（可选）。默认为 `'查询成功'`

### ApiErrorResponseDecorator

用于处理错误响应（HTTP 4xx/5xx）

```typescript
export const ApiErrorResponseDecorator = (
  status: number,
  description: string = '请求失败',
) => MethodDecorator;
```

**参数：**

- `status`: HTTP 状态码（必需）。例如：`404`、`409`、`500`
- `description`: 错误描述（可选）。默认为 `'请求失败'`

## 与其他装饰器的组合

成功响应装饰器与错误响应装饰器配合使用：

```typescript
@ApiOperation({ summary: '更新用户' })
@ApiSuccessResponseDecorator(UserResponseDto, '更新成功')
@ApiErrorResponseDecorator(404, '用户不存在')
@ApiErrorResponseDecorator(400, '输入参数无效')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Patch(':id')
update(
  @Param('id') id: string,
  @Body() updateDto: UpdateUserDto,
): Promise<UserResponseDto> {
  return this.usersService.update(id, updateDto);
}
```

**说明：**

- 成功响应使用 `ApiSuccessResponseDecorator`
- 每个不同的错误状态码使用一个 `ApiErrorResponseDecorator`
- 多个错误状态码可以堆叠多个装饰器

## 生成的 Swagger Schema 示例

使用装饰器后，Swagger UI 中会显示如下 Schema：

```json
{
  "ApiSuccessResponse": {
    "type": "object",
    "properties": {
      "code": { "type": "string", "example": "200" },
      "message": { "type": "string", "example": "success" },
      "data": { "$ref": "#/components/schemas/UserResponseDto" },
      "requestId": { "type": "string" },
      "timestamp": { "type": "string" },
      "timezone": { "type": "string" }
    }
  }
}
```

## 常见问题

### Q: 为什么要使用这个装饰器而不是直接用 `@ApiResponse`？

A: 直接使用 `@ApiResponse({ type: ApiSuccessResponse<T> })` 会导致 Swagger 无法理解泛型参数 `T`，最终 `data` 字段会显示为 `{}` 或缺失信息。使用装饰器可以：

- ✅ 正确显示 `data` 字段的完整结构
- ✅ 生成的客户端代码有完整的类型定义
- ✅ 代码更简洁易维护

### Q: ApiErrorResponseDecorator 和 @ApiResponse 的区别？

A: `ApiErrorResponseDecorator` 针对 `ApiErrorResponse` 结构进行了优化：

- ✅ 自动应用 `ApiErrorResponse` 的 Schema
- ✅ 错误响应结构统一
- ✅ 无需重复指定响应类型

### Q: 能否为不同的状态码使用不同的响应类型？

A: 对于成功响应，装饰器默认使用 200 状态码。如果需要 201（Created），可以结合使用：

```typescript
@ApiCreatedResponse({
  schema: {
    allOf: [
      { $ref: getSchemaPath(ApiSuccessResponse) },
      {
        properties: {
          data: { $ref: getSchemaPath(ProjectResponseDto) }
        }
      }
    ]
  }
})
@Post()
create(@Body() dto: CreateProjectDto): Promise<ProjectResponseDto> {
  return this.projectsService.create(dto);
}
```

对于错误响应，可以使用多个 `ApiErrorResponseDecorator`：

```typescript
@ApiErrorResponseDecorator(404, '资源不存在')
@ApiErrorResponseDecorator(409, '资源名称重复')
@Patch(':id')
update(@Param('id') id: string, @Body() dto: UpdateDto) { ... }
```

### Q: 是否支持数组响应？

A: 对于数组响应，应该使用包含数组的 DTO，例如：

```typescript
class UsersListDto {
  @ApiProperty({ type: [UserResponseDto] })
  items: UserResponseDto[];

  @ApiProperty()
  total: number;
}

// 然后使用：
@ApiSuccessResponseDecorator(UsersListDto)
@Get()
getList() { ... }
```

## 扩展

### 创建分页响应专用装饰器

如果需要为特定场景创建变体，可以扩展装饰器：

```typescript
// 为分页响应创建专用装饰器
export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return ApiSuccessResponseDecorator(model, '查询成功');
};

// 使用：
@ApiPaginatedResponse(UsersPageDto)
@Get()
findAll() { ... }
```

### 创建常用错误装饰器组合

```typescript
// 常见的 CRUD 错误组合
export const ApiCrudErrorResponses = () => {
  return applyDecorators(
    ApiErrorResponseDecorator(404, '资源不存在'),
    ApiErrorResponseDecorator(409, '资源冲突'),
    ApiErrorResponseDecorator(500, '服务器错误'),
  );
};

// 使用：
@ApiCrudErrorResponses()
@Patch(':id')
update() { ... }
```
