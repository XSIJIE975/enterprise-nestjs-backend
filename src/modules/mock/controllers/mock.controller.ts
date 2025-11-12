import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import {
  ApiSuccessResponseDecorator,
  ApiSuccessResponseArrayDecorator,
} from '@/common/decorators/swagger-response.decorator';
import {
  CreateMockEndpointDto,
  UpdateMockEndpointDto,
  QueryMockLogsDto,
  BatchOperationMockEndpointsDto,
  ImportConfigDto,
} from '@/modules/mock/dto';
import { MockService } from '../services/mock.service';
import { mapToVo } from '../utils/mapper.util';
import {
  MockEndpointVo,
  BatchOperationResultVo,
  DeleteResultVo,
  ClearCacheResultVo,
  ImportConfigResultVo,
  MockStatsVo,
  MockLogListVo,
  ClearLogsResultVo,
} from '../vo';

@Controller('mock-endpoints')
@ApiTags('Mock')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class MockController {
  constructor(private readonly mockService: MockService) {}

  @Post()
  @ApiOperation({ summary: '创建 Mock 端点' })
  @ApiSuccessResponseDecorator(MockEndpointVo, {
    status: 201,
    description: '创建成功',
  })
  async create(@Body() dto: CreateMockEndpointDto): Promise<MockEndpointVo> {
    const res = await this.mockService.create(dto);
    return mapToVo(res);
  }

  @Get()
  @ApiOperation({ summary: '获取 Mock 端点列表' })
  @ApiSuccessResponseArrayDecorator(MockEndpointVo, { description: '获取成功' })
  async list(): Promise<MockEndpointVo[]> {
    const rows = await this.mockService.list();
    return rows.map(mapToVo);
  }

  @Get('export')
  @ApiOperation({ summary: '导出所有 Mock 端点配置' })
  @ApiSuccessResponseDecorator(MockEndpointVo, { description: '导出成功' })
  async export(): Promise<MockEndpointVo[]> {
    const endpoints = await this.mockService.exportConfig();
    return endpoints.map(mapToVo);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取 Mock 统计信息' })
  @ApiSuccessResponseDecorator(MockStatsVo, { description: '获取成功' })
  async getStats(): Promise<MockStatsVo> {
    return this.mockService.getStats();
  }

  @Get('logs')
  @ApiOperation({ summary: '查询 Mock 调用日志' })
  @ApiSuccessResponseDecorator(MockLogListVo, { description: '查询成功' })
  async getLogs(@Query() query: QueryMockLogsDto): Promise<MockLogListVo> {
    return this.mockService.queryLogs(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '根据 ID 获取 Mock 端点详情' })
  @ApiSuccessResponseDecorator(MockEndpointVo, { description: '获取成功' })
  async get(@Param('id') id: string): Promise<MockEndpointVo | null> {
    const r = await this.mockService.findById(id);
    return r ? mapToVo(r) : null;
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新 Mock 端点' })
  @ApiSuccessResponseDecorator(MockEndpointVo, { description: '更新成功' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMockEndpointDto,
  ): Promise<MockEndpointVo | null> {
    const r = await this.mockService.update(id, dto);
    return r ? mapToVo(r) : null;
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Mock 端点' })
  @ApiSuccessResponseDecorator(DeleteResultVo, { description: '删除成功' })
  async remove(@Param('id') id: string): Promise<DeleteResultVo | null> {
    return this.mockService.remove(id);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: '启用 Mock 端点' })
  @ApiSuccessResponseDecorator(MockEndpointVo, { description: '启用成功' })
  async enable(@Param('id') id: string): Promise<MockEndpointVo | null> {
    const r = await this.mockService.enable(id);
    return r ? mapToVo(r) : null;
  }

  @Post(':id/disable')
  @ApiOperation({ summary: '禁用 Mock 端点' })
  @ApiSuccessResponseDecorator(MockEndpointVo, { description: '禁用成功' })
  async disable(@Param('id') id: string): Promise<MockEndpointVo | null> {
    const r = await this.mockService.disable(id);
    return r ? mapToVo(r) : null;
  }

  @Post('clear-cache')
  @ApiOperation({ summary: '清除 Mock 缓存' })
  @ApiSuccessResponseDecorator(ClearCacheResultVo, { description: '清除成功' })
  async clearCache(): Promise<ClearCacheResultVo> {
    return this.mockService.clearCache();
  }

  @Post('batch-enable')
  @ApiOperation({ summary: '批量启用 Mock 端点' })
  @ApiSuccessResponseDecorator(BatchOperationResultVo, {
    description: '批量操作完成',
  })
  async batchEnable(
    @Body() dto: BatchOperationMockEndpointsDto,
  ): Promise<BatchOperationResultVo> {
    return this.mockService.batchEnable(dto.ids);
  }

  @Post('batch-disable')
  @ApiOperation({ summary: '批量禁用 Mock 端点' })
  @ApiSuccessResponseDecorator(BatchOperationResultVo, {
    description: '批量操作完成',
  })
  async batchDisable(
    @Body() dto: BatchOperationMockEndpointsDto,
  ): Promise<BatchOperationResultVo> {
    return this.mockService.batchDisable(dto.ids);
  }

  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除 Mock 端点' })
  @ApiSuccessResponseDecorator(BatchOperationResultVo, {
    description: '批量操作完成',
  })
  async batchDelete(
    @Body() dto: BatchOperationMockEndpointsDto,
  ): Promise<BatchOperationResultVo> {
    return this.mockService.batchDelete(dto.ids);
  }

  @Post('import')
  @ApiOperation({ summary: '导入 Mock 端点配置' })
  @ApiSuccessResponseDecorator(ImportConfigResultVo, {
    status: 201,
    description: '导入完成',
  })
  async import(@Body() dto: ImportConfigDto): Promise<ImportConfigResultVo> {
    return this.mockService.importConfig(dto.endpoints, {
      overwrite: dto.overwrite,
    });
  }

  @Delete('logs')
  @ApiOperation({ summary: '清空 Mock 调用日志' })
  @ApiSuccessResponseDecorator(ClearLogsResultVo, { description: '清空成功' })
  async clearLogs(
    @Query('endpointId') endpointId?: string,
  ): Promise<ClearLogsResultVo> {
    return this.mockService.clearLogs(endpointId);
  }
}
