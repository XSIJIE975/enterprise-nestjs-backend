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
import { UsersService } from './users.service';
import { RequestContextService } from '../../shared/request-context/request-context.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DisableDatabaseLog } from '../../common/decorators/database-log.decorator';
import { JwtUser } from '../auth/interfaces/jwt-payload.interface';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { BatchOperationDto } from './dto/batch-operation.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginatedUsersDto } from './dto/paginated-users.dto';
import { UserStatisticsDto } from './dto/user-statistics.dto';
import { UserSessionDto } from './dto/user-session.dto';

/**
 * 用户管理控制器
 * 提供用户 CRUD、角色管理、会话管理等功能
 */
@ApiTags('用户管理')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /* ==================== 管理员接口 ==================== */

  /**
   * 获取用户列表（分页、搜索、过滤）
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '获取用户列表（管理员）' })
  @ApiResponse({
    status: 200,
    description: '成功获取用户列表',
    type: PaginatedUsersDto,
  })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: '每页数量',
    example: 10,
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
    description: '搜索关键词（用户名、邮箱、姓名）',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: '是否激活',
    type: Boolean,
  })
  @ApiQuery({
    name: 'isVerified',
    required: false,
    description: '是否验证',
    type: Boolean,
  })
  @ApiQuery({ name: 'role', required: false, description: '角色代码' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: '排序字段',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    description: '排序方向',
    enum: ['asc', 'desc'],
  })
  async findAll(@Query() query: QueryUsersDto): Promise<PaginatedUsersDto> {
    return this.usersService.findAllPaginated(query);
  }

  /**
   * 获取用户统计数据
   */
  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '获取用户统计数据（管理员）' })
  @ApiResponse({
    status: 200,
    description: '成功获取统计数据',
    type: UserStatisticsDto,
  })
  async getStatistics(): Promise<UserStatisticsDto> {
    return this.usersService.getUserStatistics();
  }

  /**
   * 获取指定用户详情
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '获取用户详情（管理员）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({
    status: 200,
    description: '成功获取用户信息',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  /**
   * 更新用户信息
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '更新用户信息（管理员）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({
    status: 200,
    description: '成功更新用户信息',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 409, description: '邮箱/用户名/手机号已被使用' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
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
  @ApiResponse({ status: 204, description: '成功删除用户' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
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
  @ApiResponse({
    status: 200,
    description: '成功更新用户状态',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ): Promise<UserResponseDto> {
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
  @ApiResponse({
    status: 200,
    description: '成功验证用户邮箱',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 409, description: '用户邮箱已验证' })
  async verifyUser(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto> {
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
  @ApiResponse({ status: 200, description: '成功重置密码' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.usersService.resetUserPassword(id, resetPasswordDto.newPassword);
    return { message: '密码重置成功' };
  }

  /**
   * 分配角色给用户
   */
  @Post(':id/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '分配角色给用户（管理员）' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({
    status: 200,
    description: '成功分配角色',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: '用户不存在或部分角色不存在' })
  async assignRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignRolesDto: AssignRolesDto,
  ): Promise<UserResponseDto> {
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
  @ApiResponse({ status: 204, description: '成功移除角色' })
  @ApiResponse({ status: 404, description: '用户不存在或角色不存在' })
  async removeRole(
    @Param('id', ParseIntPipe) id: number,
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
  @ApiResponse({ status: 200, description: '成功获取角色列表' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getUserRoles(@Param('id', ParseIntPipe) id: number): Promise<any[]> {
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
  @ApiResponse({ status: 200, description: '成功删除用户' })
  @ApiResponse({ status: 404, description: '没有找到可删除的用户' })
  async batchDelete(
    @Body() batchOperationDto: BatchOperationDto,
  ): Promise<{ message: string; count: number }> {
    const count = await this.usersService.batchDelete(batchOperationDto.ids);
    return { message: '批量删除成功', count };
  }

  /* ==================== 普通用户接口 ==================== */

  /**
   * 获取当前用户资料
   */
  @Get('profile/me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取当前用户资料' })
  @ApiResponse({
    status: 200,
    description: '成功获取个人资料',
    type: UserResponseDto,
  })
  async getProfile(@CurrentUser() user: JwtUser): Promise<UserResponseDto> {
    return this.usersService.findOne(user.userId);
  }

  /**
   * 更新个人资料
   */
  @Patch('profile/me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '更新个人资料' })
  @ApiResponse({
    status: 200,
    description: '成功更新个人资料',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: '用户名/手机号已被使用' })
  async updateProfile(
    @CurrentUser() user: JwtUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
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
  @ApiResponse({ status: 200, description: '密码修改成功' })
  @ApiResponse({ status: 409, description: '旧密码不正确或新密码与旧密码相同' })
  async changePassword(
    @CurrentUser() user: JwtUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.usersService.changePassword(
      user.userId,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
    return { message: '密码修改成功' };
  }

  /**
   * 获取会话列表
   */
  @Get('profile/sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取当前用户的会话列表' })
  @ApiResponse({
    status: 200,
    description: '成功获取会话列表',
    type: [UserSessionDto],
  })
  async getSessions(@CurrentUser() user: JwtUser): Promise<UserSessionDto[]> {
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
  @ApiResponse({ status: 200, description: '成功注销其他会话' })
  async logoutOtherSessions(
    @CurrentUser() user: JwtUser,
  ): Promise<{ message: string }> {
    // 从 RequestContext 中获取 access token（由 JwtStrategy 设置）
    const accessToken = RequestContextService.get<string>('accessToken');

    if (!accessToken) {
      return { message: '无法获取当前会话信息' };
    }

    await this.usersService.logoutOtherSessions(user.userId, accessToken);

    return { message: '成功注销其他会话' };
  }
}
