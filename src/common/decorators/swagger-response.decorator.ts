import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiSuccessResponse, ApiErrorResponse } from '../dtos';

/**
 * Swagger 成功响应配置选项
 */
export interface ApiSuccessResponseOptions {
  /** HTTP 状态码（默认：200） */
  status?: number;
  /** 响应描述（默认：'查询成功'） */
  description?: string;
}

/**
 * Swagger 成功响应装饰器
 * 用于为 ApiSuccessResponse<T> 泛型在 Swagger 中生成正确的 Schema
 *
 * @param model 响应数据类型
 * @param options 配置选项，支持自定义状态码和描述
 *
 * @example
 * // 使用默认配置（200 状态码，'查询成功' 描述）
 * @ApiSuccessResponseDecorator(UserDto)
 * @Get()
 * findAll() { ... }
 *
 * @example
 * // 自定义描述，保持默认状态码（200）
 * @ApiSuccessResponseDecorator(UserDto, { description: '用户列表获取成功' })
 * @Get()
 * findAll() { ... }
 *
 * @example
 * // 自定义状态码和描述
 * @ApiSuccessResponseDecorator(UserDto, { status: 201, description: '用户创建成功' })
 * @Post()
 * create() { ... }
 *
 * @example
 * // 仅自定义状态码，保持默认描述
 * @ApiSuccessResponseDecorator(UserDto, { status: 201 })
 * @Post()
 * create() { ... }
 */
export const ApiSuccessResponseDecorator = <TModel extends Type<any>>(
  model: TModel,
  options?: ApiSuccessResponseOptions,
) => {
  const status = options?.status ?? 200;
  const description = options?.description ?? '查询成功';

  const schema = {
    allOf: [
      { $ref: getSchemaPath(ApiSuccessResponse) },
      {
        properties: {
          data: {
            $ref: getSchemaPath(model),
          },
        },
      },
    ],
  };

  // 根据状态码选择使用 ApiOkResponse（200）或 ApiResponse（其他状态码）
  if (status === 200) {
    return applyDecorators(
      ApiExtraModels(ApiSuccessResponse, model),
      ApiOkResponse({
        schema,
        description,
      }),
    );
  }

  return applyDecorators(
    ApiExtraModels(ApiSuccessResponse, model),
    ApiResponse({
      status,
      schema,
      description,
    }),
  );
};

/**
 * Swagger 错误响应配置选项
 */
export interface ApiErrorResponseOptions {
  /** 响应描述（默认：'请求失败'） */
  description?: string;
}

/**
 * Swagger 错误响应装饰器
 * 用于为 ApiErrorResponse 在 Swagger 中生成正确的 Schema
 *
 * @param status 响应状态码（必需）
 * @param options 配置选项
 *
 * @example
 * // 使用默认描述（'请求失败'）
 * @ApiErrorResponseDecorator(404)
 * @Get(':id')
 * getOne() { ... }
 *
 * @example
 * // 自定义错误描述
 * @ApiErrorResponseDecorator(404, { description: '资源不存在' })
 * @Get(':id')
 * getOne() { ... }
 *
 * @example
 * // 多个错误状态码装饰器组合
 * @ApiErrorResponseDecorator(400, { description: '参数验证失败' })
 * @ApiErrorResponseDecorator(401, { description: '未授权' })
 * @ApiErrorResponseDecorator(500, { description: '服务器错误' })
 * @Post()
 * create() { ... }
 */
export const ApiErrorResponseDecorator = (
  status: number,
  options?: ApiErrorResponseOptions,
) => {
  const description = options?.description ?? '请求失败';

  return applyDecorators(
    ApiExtraModels(ApiErrorResponse),
    ApiResponse({
      status,
      schema: {
        allOf: [{ $ref: getSchemaPath(ApiErrorResponse) }],
      },
      description,
    }),
  );
};
