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
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RequestContextService } from '@/shared/request-context/request-context.service';
import {
  ApiSuccessResponseDecorator,
  ApiErrorResponseDecorator,
  ApiSuccessResponseArrayDecorator,
} from '@/common/decorators/swagger-response.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { DisableDatabaseLog } from '@/common/decorators/database-log.decorator';
import { JwtUser } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  QueryUsersDto,
  AssignRolesDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  ResetPasswordDto,
  BatchOperationDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from './dto';
import {
  UserStatisticsVo,
  UserResponseVo,
  UserPageVo,
  UserRoleVo,
  UserSessionVo,
} from './vo';

/**
 * 用户管理控制器
 * 提供用户 CRUD、角色管理、会话管理等功能
 */
@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /* ==================== 管理员接口 ==================== */

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '创建新用户（管理员）' })
  @ApiSuccessResponseDecorator(UserResponseVo, {
    status: HttpStatus.CREATED,
    description: '成功创建新用户',
  })
  @ApiErrorResponseDecorator(HttpStatus.CONFLICT, {
    description: '邮箱/用户名/手机号已被使用',
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseVo> {
    return this.usersService.create(createUserDto);
  }

  /**
   * 获取用户列表（分页、搜索、过滤）
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '获取用户列表（管理员）' })
  @ApiSuccessResponseDecorator(UserPageVo, {
    status: HttpStatus.OK,
    description: '成功获取用户列表',
  })
  async findAll(@Query() query: QueryUsersDto): Promise<UserPageVo> {
    return this.usersService.findAllPaginated(query);
  }

  /**
   * 获取用户统计数据
   */
  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '获取用户统计数据（管理员）' })
  @ApiSuccessResponseDecorator(UserStatisticsVo, {
    status: HttpStatus.OK,
    description: '成功获取统计数据',
  })
  async getStatistics(): Promise<UserStatisticsVo> {
    return this.usersService.getUserStatistics();
  }

  @Get(':id/sessions')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @Permissions('user_session:list')
  @ApiOperation({ summary: '获取指定用户的会话列表（管理员）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiSuccessResponseArrayDecorator(UserSessionVo, {
    description: '成功获取会话列表',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在',
  })
  async getUserSessionsByAdmin(
    @Param('id') id: string,
  ): Promise<UserSessionVo[]> {
    const accessToken = RequestContextService.get<string>('accessToken');
    return this.usersService.getUserSessions(id, accessToken);
  }

  /**
   * 获取指定用户详情
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '获取用户详情（管理员）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiSuccessResponseDecorator(UserResponseVo, {
    status: HttpStatus.OK,
    description: '成功获取用户信息',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在',
  })
  async findOne(@Param('id') id: string): Promise<UserResponseVo> {
    return this.usersService.findOne(id);
  }

  @Delete(':id/sessions/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @Permissions('user_session:revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '注销指定用户的指定会话（管理员）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiParam({ name: 'sessionId', description: '会话 ID' })
  @ApiSuccessResponseDecorator(undefined, {
    status: HttpStatus.NO_CONTENT,
    description: '成功注销会话',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在或会话不存在',
  })
  async revokeUserSessionByAdmin(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    await this.usersService.revokeUserSessionByAdmin(id, sessionId);
  }

  /**
   * 更新用户信息
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '更新用户信息（管理员）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiSuccessResponseDecorator(UserResponseVo, {
    status: HttpStatus.OK,
    description: '成功更新用户信息',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在',
  })
  @ApiErrorResponseDecorator(HttpStatus.CONFLICT, {
    description: '邮箱/用户名/手机号已被使用',
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseVo> {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * 删除用户（软删除）
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除用户（管理员）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiSuccessResponseDecorator(undefined, {
    status: HttpStatus.NO_CONTENT,
    description: '成功删除用户',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }

  /**
   * 更新用户状态（激活/禁用）
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '更新用户状态（管理员）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiSuccessResponseDecorator(UserResponseVo, {
    status: HttpStatus.OK,
    description: '成功更新用户状态',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ): Promise<UserResponseVo> {
    return this.usersService.updateUserStatus(id, updateUserStatusDto.isActive);
  }

  /**
   * 验证用户邮箱
   */
  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '验证用户邮箱（管理员）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiSuccessResponseDecorator(UserResponseVo, {
    status: HttpStatus.OK,
    description: '成功验证用户邮箱',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在',
  })
  @ApiErrorResponseDecorator(HttpStatus.CONFLICT, {
    description: '用户邮箱已验证',
  })
  async verifyUser(@Param('id') id: string): Promise<UserResponseVo> {
    return this.usersService.verifyUser(id);
  }

  /**
   * 重置用户密码（管理员操作）
   */
  @Post(':id/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @DisableDatabaseLog()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重置用户密码（管理员）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiSuccessResponseDecorator(undefined, {
    status: HttpStatus.OK,
    description: '成功重置密码',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在',
  })
  async resetPassword(
    @Param('id') id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<void> {
    await this.usersService.resetUserPassword(id, resetPasswordDto.newPassword);
  }

  /**
   * 分配角色给用户
   */
  @Post(':id/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '分配角色给用户（管理员）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiSuccessResponseDecorator(UserResponseVo, {
    status: HttpStatus.OK,
    description: '成功分配角色',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在',
  })
  @ApiErrorResponseDecorator(HttpStatus.UNPROCESSABLE_ENTITY, {
    description: '部分分配的角色不存在',
  })
  async assignRoles(
    @Param('id') id: string,
    @Body() assignRolesDto: AssignRolesDto,
  ): Promise<any> {
    return this.usersService.assignRoles(id, assignRolesDto.roleIds);
  }

  /**
   * 移除用户的角色
   */
  @Delete(':id/roles/:roleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '移除用户的角色（管理员）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiParam({ name: 'roleId', description: '角色 ID' })
  @ApiSuccessResponseDecorator(undefined, {
    status: HttpStatus.NO_CONTENT,
    description: '成功移除角色',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在或者角色不存在',
  })
  async removeRole(
    @Param('id') id: string,
    @Param('roleId', ParseIntPipe) roleId: number,
  ): Promise<void> {
    return this.usersService.removeRole(id, roleId);
  }

  /**
   * 获取用户的角色列表
   */
  @Get(':id/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '获取用户的角色列表（管理员）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiSuccessResponseDecorator(UserResponseVo, {
    status: HttpStatus.OK,
    description: '成功获取角色列表',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在',
  })
  async getUserRoles(@Param('id') id: string): Promise<UserRoleVo[]> {
    return this.usersService.getUserRoles(id);
  }

  /**
   * 批量删除用户
   */
  @Post('batch-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量删除用户（管理员）' })
  @ApiSuccessResponseDecorator(undefined, {
    description: '成功删除用户',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '没有找到可删除的用户',
  })
  async batchDelete(
    @Body() batchOperationDto: BatchOperationDto,
  ): Promise<number> {
    return await this.usersService.batchDelete(batchOperationDto.ids);
  }

  /* ==================== 普通用户接口 ==================== */

  /**
   * 获取当前用户资料
   */
  @Get('profile/me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取当前用户资料' })
  @ApiSuccessResponseDecorator(UserResponseVo, {
    description: '成功获取个人资料',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在',
  })
  async getProfile(@CurrentUser() user: JwtUser): Promise<UserResponseVo> {
    return this.usersService.findOne(user.userId);
  }

  /**
   * 更新个人资料
   */
  @Patch('profile/me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '更新个人资料' })
  @ApiSuccessResponseDecorator(UserResponseVo, {
    description: '成功更新个人资料',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在',
  })
  @ApiErrorResponseDecorator(HttpStatus.CONFLICT, {
    description: '用户名/邮箱/手机号已被使用',
  })
  async updateProfile(
    @CurrentUser() user: JwtUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseVo> {
    return this.usersService.updateProfile(user.userId, updateProfileDto);
  }

  /**
   * 修改密码
   */
  @Post('profile/change-password')
  @UseGuards(JwtAuthGuard)
  @DisableDatabaseLog()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '修改密码' })
  @ApiSuccessResponseDecorator(undefined, {
    status: HttpStatus.NO_CONTENT,
    description: '密码修改成功',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在',
  })
  @ApiErrorResponseDecorator(HttpStatus.CONFLICT, {
    description: '旧密码不正确/新密码与旧密码相同',
  })
  async changePassword(
    @CurrentUser() user: JwtUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      user.userId,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }

  /**
   * 获取会话列表
   */
  @Get('profile/sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取当前用户的会话列表' })
  @ApiSuccessResponseArrayDecorator(UserSessionVo, {
    description: '成功获取会话列表',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在',
  })
  async getSessions(@CurrentUser() user: JwtUser): Promise<UserSessionVo[]> {
    // 从 RequestContext 中获取 access token（由 JwtStrategy 设置）
    const accessToken = RequestContextService.get<string>('accessToken');

    return this.usersService.getUserSessions(user.userId, accessToken);
  }

  /**
   * 注销其他会话（保留当前会话）
   */
  @Post('profile/logout-other-sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '注销其他会话' })
  @ApiSuccessResponseDecorator(undefined, {
    status: HttpStatus.NO_CONTENT,
    description: '成功注销其他会话',
  })
  @ApiErrorResponseDecorator(HttpStatus.NOT_FOUND, {
    description: '用户不存在/当前会话不存在',
  })
  async logoutOtherSessions(@CurrentUser() user: JwtUser) {
    // 从 RequestContext 中获取 access token（由 JwtStrategy 设置）
    const accessToken = RequestContextService.get<string>('accessToken');
    await this.usersService.logoutOtherSessions(user.userId, accessToken);
  }
}
