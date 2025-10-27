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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  UpdatePermissionStatusDto,
  QueryPermissionsDto,
  PermissionResponseDto,
  PaginatedPermissionsDto,
} from './dto';

/**
 * 权限管理控制器
 * 提供权限 CRUD、状态管理等功能
 */
@ApiTags('Permissions')
@ApiBearerAuth('JWT-auth')
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @Roles('admin')
  @Permissions('permission:create')
  @ApiOperation({ summary: '创建权限' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '权限创建成功',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '权限名称或代码已存在',
  })
  async create(
    @Body() createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.create(createPermissionDto);
  }

  @Get()
  @Permissions('permission:read')
  @ApiOperation({ summary: '获取所有权限' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: [PermissionResponseDto],
  })
  async findAll(): Promise<PermissionResponseDto[]> {
    return this.permissionsService.findAll();
  }

  @Get('paginated')
  @Permissions('permission:read')
  @ApiOperation({ summary: '分页查询权限列表' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    type: PaginatedPermissionsDto,
  })
  @ApiQuery({ type: QueryPermissionsDto })
  async findAllPaginated(
    @Query() query: QueryPermissionsDto,
  ): Promise<PaginatedPermissionsDto> {
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '权限不存在',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @Permissions('permission:update')
  @ApiOperation({ summary: '更新权限信息' })
  @ApiParam({
    name: 'id',
    description: '权限ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新成功',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '权限不存在',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '权限名称或代码已存在',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.update(id, updatePermissionDto);
  }

  @Patch(':id/status')
  @Roles('admin')
  @Permissions('permission:update')
  @ApiOperation({ summary: '更新权限状态' })
  @ApiParam({
    name: 'id',
    description: '权限ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '状态更新成功',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '权限不存在',
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdatePermissionStatusDto,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.updatePermissionStatus(
      id,
      updateStatusDto.isActive,
    );
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('permission:delete')
  @ApiOperation({ summary: '删除权限' })
  @ApiParam({
    name: 'id',
    description: '权限ID',
    type: Number,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '删除成功',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '权限不存在',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.permissionsService.remove(id);
  }

  @Get('stats/overview')
  @Permissions('permission:read')
  @ApiOperation({ summary: '获取权限统计数据' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
  })
  async getStatistics(): Promise<any> {
    return this.permissionsService.getPermissionStatistics();
  }

  @Delete('batch')
  @Roles('admin')
  @Permissions('permission:delete')
  @ApiOperation({ summary: '批量删除权限' })
  @ApiQuery({
    name: 'ids',
    description: '权限ID数组，多个ID用逗号分隔',
    example: '1,2,3',
  })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: '批量删除成功',
    schema: {
      type: 'object',
      properties: {
        deletedCount: {
          type: 'number',
          description: '删除的权限数量',
        },
      },
    },
  })
  async batchDelete(
    @Query('ids') ids: string,
  ): Promise<{ deletedCount: number }> {
    const idArray = ids.split(',').map(id => parseInt(id.trim(), 10));
    const deletedCount = await this.permissionsService.batchDelete(idArray);
    return { deletedCount };
  }
}
