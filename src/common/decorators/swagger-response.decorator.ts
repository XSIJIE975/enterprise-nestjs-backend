import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiSuccessResponse, ApiErrorResponse } from '../dtos';

/**
 * Swagger 成功响应装饰器
 * 用于为 ApiSuccessResponse<T> 泛型在 Swagger 中生成正确的 Schema
 *
 * @param model 响应数据类型
 * @param description 响应描述（默认：'查询成功'）
 *
 * @example
 * @ApiSuccessResponseDecorator(PaginatedCsProjectTemplatesDto)
 * @Get()
 * findAll() { ... }
 */
export const ApiSuccessResponseDecorator = <TModel extends Type<any>>(
  model: TModel,
  description: string = '查询成功',
) => {
  return applyDecorators(
    ApiExtraModels(ApiSuccessResponse, model),
    ApiOkResponse({
      schema: {
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
      },
      description,
    }),
  );
};

/**
 * Swagger 错误响应装饰器
 * 用于为 ApiErrorResponse 在 Swagger 中生成正确的 Schema
 *
 * @param status 响应状态码
 * @param description 响应描述（默认：'请求失败'）
 *
 * @example
 * @ApiErrorResponseDecorator(404, '资源不存在')
 * @Get()
 * GetOne() { ... }
 */
export const ApiErrorResponseDecorator = (
  status: number,
  description: string = '请求失败',
) => {
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
