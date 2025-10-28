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
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRoleStatusDto,
  AssignPermissionsDto,
  QueryRolesDto,
  RoleResponseDto,
  PaginatedRolesDto,
} from './dto';

/**
 * 角色管理控制器
 * 提供角色 CRUD、权限分配、状态管理等功能
 */
@ApiTags('Roles')
@ApiBearerAuth('JWT-auth')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles('admin')
  @Permissions('role:create')
  @ApiOperation({
    summary: '创建角色',
    description: '创建新的角色，需要管理员权限和角色创建权限',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '角色创建成功',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数验证失败或角色已存在',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '权限不足',
  })
  async create(@Body() createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @Roles('admin')
  @Permissions('role:read')
  @ApiOperation({
    summary: '获取角色列表',
    description: '获取所有角色的基础列表，需要管理员权限和角色读取权限',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: [RoleResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '权限不足',
  })
  async findAll(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }

  @Get('paginated')
  @Roles('admin')
  @Permissions('role:read')
  @ApiOperation({
    summary: '分页查询角色',
    description: '支持关键词搜索、状态筛选和排序的分页查询',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '页码（从1开始）',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: '每页数量',
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: String,
    description: '搜索关键词（角色名称、代码或描述）',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: '角色状态筛选',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'updatedAt', 'name', 'code'],
    description: '排序字段',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    description: '排序方向',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    type: PaginatedRolesDto,
  })
  async findAllPaginated(
    @Query() query: QueryRolesDto,
  ): Promise<PaginatedRolesDto> {
    return this.rolesService.findAllPaginated(query);
  }

  @Get(':id')
  @Roles('admin')
  @Permissions('role:read')
  @ApiOperation({
    summary: '获取角色详情',
    description: '根据ID获取单个角色的详细信息',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: '角色ID',
  })
  @ApiQuery({
    name: 'includePermissions',
    required: false,
    type: Boolean,
    description: '是否包含权限信息',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '角色不存在',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('includePermissions') includePermissions?: string,
  ): Promise<RoleResponseDto> {
    const includePerms = includePermissions === 'true';
    return this.rolesService.findOne(id, includePerms);
  }

  @Get('code/:code')
  @Roles('admin')
  @Permissions('role:read')
  @ApiOperation({
    summary: '根据代码获取角色',
    description: '根据角色代码获取角色信息',
  })
  @ApiParam({
    name: 'code',
    type: String,
    description: '角色代码',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '角色不存在',
  })
  async findByCode(@Param('code') code: string): Promise<RoleResponseDto> {
    return this.rolesService.findByCode(code);
  }

  @Patch(':id')
  @Roles('admin')
  @Permissions('role:update')
  @ApiOperation({
    summary: '更新角色',
    description: '更新角色的基本信息（名称、代码、描述）',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: '角色ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新成功',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '角色不存在',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数验证失败或角色名称/代码已存在',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Patch(':id/status')
  @Roles('admin')
  @Permissions('role:update')
  @ApiOperation({
    summary: '更新角色状态',
    description: '启用或禁用角色',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: '角色ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新成功',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '角色不存在',
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleStatusDto: UpdateRoleStatusDto,
  ): Promise<RoleResponseDto> {
    return this.rolesService.updateRoleStatus(id, updateRoleStatusDto.isActive);
  }

  @Post(':id/permissions')
  @Roles('admin')
  @Permissions('role:update')
  @ApiOperation({
    summary: '为角色分配权限',
    description: '替换角色的所有权限，会清除原有权限并设置新权限',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: '角色ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '分配成功',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '角色或权限不存在',
  })
  async assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ): Promise<RoleResponseDto> {
    return this.rolesService.assignPermissions(id, assignPermissionsDto);
  }

  @Get(':id/permissions')
  @Roles('admin')
  @Permissions('role:read')
  @ApiOperation({
    summary: '获取角色的权限',
    description: '获取指定角色拥有的所有权限',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: '角色ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: [Object],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '角色不存在',
  })
  async getRolePermissions(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any[]> {
    return this.rolesService.getRolePermissions(id);
  }

  @Get('statistics/overview')
  @Roles('admin')
  @Permissions('role:read')
  @ApiOperation({
    summary: '获取角色统计信息',
    description: '获取角色总数、激活/禁用状态统计等信息',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        total: {
          type: 'number',
          description: '角色总数',
        },
        active: {
          type: 'number',
          description: '激活角色数',
        },
        inactive: {
          type: 'number',
          description: '禁用角色数',
        },
      },
    },
  })
  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    return this.rolesService.getRoleStatistics();
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('role:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除角色',
    description: '删除指定的角色，如果角色正在被用户使用则无法删除',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: '角色ID',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '删除成功',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '角色不存在',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '角色正在被用户使用，无法删除',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.rolesService.remove(id);
  }

  @Delete('batch')
  @Roles('admin')
  @Permissions('role:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '批量删除角色',
    description: '批量删除多个角色，如果有角色正在被用户使用则全部无法删除',
  })
  @ApiQuery({
    name: 'ids',
    type: [Number],
    description: '角色ID列表',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '批量删除成功',
    schema: {
      type: 'object',
      properties: {
        deletedCount: {
          type: 'number',
          description: '删除的角色数量',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '部分角色不存在或正在被用户使用',
  })
  async batchDelete(
    @Query('ids') ids: string,
  ): Promise<{ deletedCount: number }> {
    const idArray = ids.split(',').map(id => parseInt(id.trim(), 10));
    const deletedCount = await this.rolesService.batchDelete(idArray);
    return { deletedCount };
  }

  @Get('active/codes')
  @Roles('admin')
  @Permissions('role:read')
  @ApiOperation({
    summary: '获取所有激活角色的代码',
    description: '获取所有激活状态角色的代码列表，用于权限验证',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取成功',
    type: [String],
  })
  async getAllActiveRoleCodes(): Promise<string[]> {
    return this.rolesService.getAllActiveRoleCodes();
  }
}
