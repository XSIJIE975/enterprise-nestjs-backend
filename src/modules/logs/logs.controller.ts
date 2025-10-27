import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LogsService } from './logs.service';
import {
  QueryApiLogsDto,
  QueryErrorLogsDto,
  QueryAuditLogsDto,
} from './dto/query-logs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
   * 查询 API 日志
   */
  @Get('api')
  @ApiOperation({ summary: '查询 API 日志' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async findApiLogs(@Query() query: QueryApiLogsDto) {
    return this.logsService.findApiLogs(query);
  }

  /**
   * 根据 requestId 查询 API 日志详情
   */
  @Get('api/:requestId')
  @ApiOperation({ summary: '根据 requestId 查询 API 日志详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async findApiLogByRequestId(@Param('requestId') requestId: string) {
    return this.logsService.findApiLogByRequestId(requestId);
  }

  /**
   * 查询错误日志
   */
  @Get('errors')
  @ApiOperation({ summary: '查询错误日志' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async findErrorLogs(@Query() query: QueryErrorLogsDto) {
    return this.logsService.findErrorLogs(query);
  }

  /**
   * 查询审计日志
   */
  @Get('audit')
  @ApiOperation({ summary: '查询审计日志' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async findAuditLogs(@Query() query: QueryAuditLogsDto) {
    return this.logsService.findAuditLogs(query);
  }

  /**
   * 获取日志统计信息
   */
  @Get('statistics')
  @ApiOperation({ summary: '获取日志统计信息' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.logsService.getStatistics(startDate, endDate);
  }
}
