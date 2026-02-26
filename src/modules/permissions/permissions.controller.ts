import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import {
  ApiSuccessResponseDecorator,
  ApiErrorResponseDecorator,
  ApiSuccessResponseArrayDecorator,
} from '@/common/decorators/swagger-response.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  UpdatePermissionStatusDto,
  QueryPermissionsDto,
  BatchDeletePermissionDto,
} from './dto';
import {
  PermissionResponseVo,
  PermissionPageVo,
  PermissionStatisticsVo,
} from './vo';

/**
 * 权限管理控制器
 * 提供权限 CRUD、状态管理等功能
 */
@ApiTags('Permissions')
@ApiBearerAuth('JWT-auth')
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @Permissions('permission:create')
  @ApiOperation({ summary: '创建权限' })
  @ApiSuccessResponseDecorator(PermissionResponseVo, {
    status: HttpStatus.CREATED,
    description: '权限创建成功',
  })
  @ApiErrorResponseDecorator(HttpStatus.CONFLICT, {
    description: '权限名称或代码已存在',
  })
  async create(
    @Body() createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionResponseVo> {
    return this.permissionsService.create(createPermissionDto);
  }

  @Get()
  @Permissions('permission:read')
  @ApiOperation({ summary: '获取所有权限' })
  @ApiSuccessResponseArrayDecorator(PermissionResponseVo, {
    status: HttpStatus.OK,
    description: '获取成功',
  })
  async findAll(): Promise<PermissionResponseVo[]> {
    return this.permissionsService.findAll();
  }

  @Get('paginated')
  @Permissions('permission:list')
  @ApiOperation({ summary: '分页查询权限列表' })
  @ApiSuccessResponseDecorator(PermissionPageVo, {
    status: HttpStatus.OK,
    description: '查询成功',
  })
  async findAllPaginated(
    @Query() query: QueryPermissionsDto,
  ): Promise<PermissionPageVo> {
    return this.permissionsService.findAllPaginated(query);
  }

  @Get(':id')
  @Permissions('permission:read')
  @ApiOperation({ summary: '获取单个权限' })
  @ApiParam({
    name: 'id',
    description: '权限ID',
    type: Number,
  })
  @ApiSuccessResponseDecorator(PermissionResponseVo, {
    status: HttpStatus.OK,
    description: '获取成功',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '权限不存在',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PermissionResponseVo> {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('permission:update')
  @ApiOperation({ summary: '更新权限信息' })
  @ApiParam({
    name: 'id',
    description: '权限ID',
    type: Number,
  })
  @ApiSuccessResponseDecorator(PermissionResponseVo, {
    status: HttpStatus.OK,
    description: '更新成功',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '权限不存在',
  })
  @ApiErrorResponseDecorator(HttpStatus.CONFLICT, {
    description: '权限名称或代码已存在',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ): Promise<PermissionResponseVo> {
    return this.permissionsService.update(id, updatePermissionDto);
  }

  @Patch(':id/status')
  @Permissions('permission:update')
  @ApiOperation({ summary: '更新权限状态' })
  @ApiParam({
    name: 'id',
    description: '权限ID',
    type: Number,
  })
  @ApiSuccessResponseDecorator(PermissionResponseVo, {
    status: HttpStatus.OK,
    description: '状态更新成功',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '权限不存在',
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdatePermissionStatusDto,
  ): Promise<PermissionResponseVo> {
    return this.permissionsService.updatePermissionStatus(
      id,
      updateStatusDto.isActive,
    );
  }

  @Delete(':id')
  @Permissions('permission:delete')
  @ApiOperation({ summary: '删除权限' })
  @ApiParam({
    name: 'id',
    description: '权限ID',
    type: Number,
  })
  @ApiSuccessResponseDecorator(undefined, {
    status: HttpStatus.NO_CONTENT,
    description: '删除成功',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '权限不存在',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.permissionsService.remove(id);
  }

  @Get('stats/overview')
  @Permissions('permission:statistics')
  @ApiOperation({ summary: '获取权限统计数据' })
  @ApiSuccessResponseDecorator(PermissionStatisticsVo, {
    status: HttpStatus.OK,
    description: '获取成功',
  })
  async getStatistics(): Promise<PermissionStatisticsVo> {
    return this.permissionsService.getPermissionStatistics();
  }

  @Post('batch-delete')
  @Permissions('permission:delete')
  @ApiOperation({ summary: '批量删除权限' })
  @ApiSuccessResponseDecorator(undefined, {
    status: HttpStatus.OK,
    description: '批量删除成功',
  })
  async batchDelete(
    @Body() dto: BatchDeletePermissionDto,
  ): Promise<{ deletedCount: number }> {
    const deletedCount = await this.permissionsService.batchDelete(dto.ids);
    return { deletedCount };
  }
}
