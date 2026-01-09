import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiSuccessResponseDecorator,
  ApiErrorResponseDecorator,
} from '@/common/decorators/swagger-response.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LogsService } from './logs.service';
import { QueryApiLogsDto, QueryErrorLogsDto, QueryAuditLogsDto } from './dto';
import {
  ApiLogPageVo,
  ApiLogVo,
  ErrorLogPageVo,
  AuditLogPageVo,
  LogStatisticsVo,
} from './vo';

/**
 * 日志控制器
 * 提供日志查询接口
 */
@ApiTags('Logs')
@Controller('logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  /**
   * 查询 API 日志（分页）
   * @param query 查询参数
   * @returns API 日志分页列表
   */
  @Get('api')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询 API 日志',
    description:
      '分页查询 API 请求日志，支持按方法、路径、状态码、用户ID、时间范围筛选',
  })
  @ApiSuccessResponseDecorator(ApiLogPageVo, {
    status: HttpStatus.OK,
    description: '查询成功，返回 API 日志分页数据',
  })
  @ApiErrorResponseDecorator(HttpStatus.BAD_REQUEST, {
    description: '参数验证失败',
  })
  @ApiErrorResponseDecorator(HttpStatus.UNAUTHORIZED, {
    description: '未授权，需要登录',
  })
  async findApiLogs(@Query() query: QueryApiLogsDto): Promise<ApiLogPageVo> {
    return this.logsService.findApiLogs(query);
  }

  /**
   * 根据 requestId 查询 API 日志详情
   * @param requestId 请求 ID（UUID）
   * @returns API 日志详情或 null（未找到）
   */
  @Get('api/:requestId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '根据 requestId 查询 API 日志详情',
    description:
      '通过请求 ID 查询单条 API 日志的完整信息，包括请求参数、响应数据等',
  })
  @ApiSuccessResponseDecorator(ApiLogVo, {
    status: HttpStatus.OK,
    description: '查询成功，返回 API 日志详情（未找到时返回 null）',
  })
  @ApiErrorResponseDecorator(HttpStatus.BAD_REQUEST, {
    description: '参数验证失败，requestId 格式不正确',
  })
  @ApiErrorResponseDecorator(HttpStatus.UNAUTHORIZED, {
    description: '未授权，需要登录',
  })
  async findApiLogByRequestId(
    @Param('requestId') requestId: string,
  ): Promise<ApiLogVo | null> {
    return this.logsService.findApiLogByRequestId(requestId);
  }

  /**
   * 查询错误日志（分页）
   * @param query 查询参数
   * @returns 错误日志分页列表
   */
  @Get('errors')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询错误日志',
    description: '分页查询系统错误日志，支持按错误代码、用户ID、时间范围筛选',
  })
  @ApiSuccessResponseDecorator(ErrorLogPageVo, {
    status: HttpStatus.OK,
    description: '查询成功，返回错误日志分页数据',
  })
  @ApiErrorResponseDecorator(HttpStatus.BAD_REQUEST, {
    description: '参数验证失败',
  })
  @ApiErrorResponseDecorator(HttpStatus.UNAUTHORIZED, {
    description: '未授权，需要登录',
  })
  async findErrorLogs(
    @Query() query: QueryErrorLogsDto,
  ): Promise<ErrorLogPageVo> {
    return this.logsService.findErrorLogs(query);
  }

  /**
   * 查询审计日志（分页）
   * @param query 查询参数
   * @returns 审计日志分页列表
   */
  @Get('audit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询审计日志',
    description:
      '分页查询用户操作审计日志，支持按操作类型、资源类型、用户ID、时间范围筛选',
  })
  @ApiSuccessResponseDecorator(AuditLogPageVo, {
    status: HttpStatus.OK,
    description: '查询成功，返回审计日志分页数据',
  })
  @ApiErrorResponseDecorator(HttpStatus.BAD_REQUEST, {
    description: '参数验证失败',
  })
  @ApiErrorResponseDecorator(HttpStatus.UNAUTHORIZED, {
    description: '未授权，需要登录',
  })
  async findAuditLogs(
    @Query() query: QueryAuditLogsDto,
  ): Promise<AuditLogPageVo> {
    return this.logsService.findAuditLogs(query);
  }

  /**
   * 获取日志统计信息
   * @param startDate 开始日期（可选，格式：YYYY-MM-DD）
   * @param endDate 结束日期（可选，格式：YYYY-MM-DD）
   * @returns 日志统计数据
   */
  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取日志统计信息',
    description:
      '获取日志统计数据，包括 API 日志、错误日志、审计日志总数，以及状态码分布统计',
  })
  @ApiSuccessResponseDecorator(LogStatisticsVo, {
    status: HttpStatus.OK,
    description: '查询成功，返回日志统计信息',
  })
  @ApiErrorResponseDecorator(HttpStatus.BAD_REQUEST, {
    description: '参数验证失败，日期格式不正确',
  })
  @ApiErrorResponseDecorator(HttpStatus.UNAUTHORIZED, {
    description: '未授权，需要登录',
  })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<LogStatisticsVo> {
    return this.logsService.getStatistics(startDate, endDate);
  }
}
