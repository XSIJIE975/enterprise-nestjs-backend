import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiResponse,
  ApiBody,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiSuccessResponse, ApiErrorResponse } from '../vo';

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
 * @param model 响应数据类型（可选，如果不需要返回数据可不传）
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
 *
 * @example
 * // 不需要返回数据，只返回统一的响应格式
 * @ApiSuccessResponseDecorator()
 * @Delete(':id')
 * remove() { ... }
 *
 * @example
 * // 不返回数据，但自定义描述
 * @ApiSuccessResponseDecorator(undefined, { description: '删除成功' })
 * @Delete(':id')
 * remove() { ... }
 *
 * @example
 * // 不返回数据，但自定义状态码
 * @ApiSuccessResponseDecorator(undefined, { status: 204 })
 * @Delete(':id')
 * remove() { ... }
 */
export const ApiSuccessResponseDecorator = <TModel extends Type<any>>(
  model?: TModel,
  options?: ApiSuccessResponseOptions,
) => {
  const status = options?.status ?? 200;
  const description = options?.description ?? '查询成功';

  // 如果没有提供 model，返回统一的响应格式（不包含 data 字段的类型）
  if (!model) {
    const schema = {
      allOf: [{ $ref: getSchemaPath(ApiSuccessResponse) }],
    };

    if (status === 200) {
      return applyDecorators(
        ApiExtraModels(ApiSuccessResponse),
        ApiOkResponse({
          schema,
          description,
        }),
      );
    }

    return applyDecorators(
      ApiExtraModels(ApiSuccessResponse),
      ApiResponse({
        status,
        schema,
        description,
      }),
    );
  }

  // 如果提供了 model，返回包含泛型数据的响应格式
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

/**
 * Swagger 数组响应装饰器
 * 用于返回数组类型的响应，在 data 字段中显示数组项的类型
 *
 * @param itemType 数组项的类型
 * @param options 配置选项
 *
 * @example
 * @ApiSuccessResponseArrayDecorator(CsDevStatsVo, { description: '统计成功' })
 * @Post('stats')
 * stats() { ... }
 */
export const ApiSuccessResponseArrayDecorator = <TModel extends Type<any>>(
  itemType: TModel,
  options?: ApiSuccessResponseOptions,
) => {
  const status = options?.status ?? 200;
  const description = options?.description ?? '查询成功';

  // 数组响应的 Schema 结构
  const schema = {
    allOf: [
      { $ref: getSchemaPath(ApiSuccessResponse) },
      {
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: getSchemaPath(itemType),
            },
          },
        },
      },
    ],
  };

  if (status === 200) {
    return applyDecorators(
      ApiExtraModels(ApiSuccessResponse, itemType),
      ApiOkResponse({
        schema,
        description,
      }),
    );
  }

  return applyDecorators(
    ApiExtraModels(ApiSuccessResponse, itemType),
    ApiResponse({
      status,
      schema,
      description,
    }),
  );
};

/**
 * Swagger 请求体配置选项
 */
export interface ApiBodyOneOfOptions {
  /** 请求体描述 */
  description?: string;
  /** 是否必需（默认：true） */
  required?: boolean;
}

/**
 * Swagger 请求体装饰器（支持单个对象或数组）
 * 用于在 Swagger 中生成支持单个对象或对象数组的请求体 Schema
 *
 * @param model 请求体数据类型
 * @param options 配置选项
 *
 * @example
 * // 支持单条或批量上传
 * @ApiBodyOneOfDecorator(UploadLoggerDto, {
 *   description: '单条日志对象或日志对象数组',
 * })
 * @Post('/logger/add')
 * reportLog(@Body() data: UploadLoggerDto | UploadLoggerDto[]) { ... }
 */
export const ApiBodyOneOfDecorator = <TModel extends Type<any>>(
  model: TModel,
  options?: ApiBodyOneOfOptions,
) => {
  const description = options?.description ?? '单个对象或对象数组';
  const required = options?.required ?? true;

  return applyDecorators(
    ApiExtraModels(model),
    ApiBody({
      description,
      required,
      schema: {
        oneOf: [
          { $ref: getSchemaPath(model) },
          {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
        ],
      },
    }),
  );
};
