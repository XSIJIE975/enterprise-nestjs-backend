import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DisableDatabaseLog } from '../../common/decorators/database-log.decorator';
import { AuthUser } from './types/user.types';

/**
 * 认证控制器
 * 处理用户注册、登录、Token 刷新、退出登录等
 *
 * 限流策略：
 * - 登录接口：1分钟内最多5次（防止暴力破解）
 * - 刷新Token：1分钟内最多10次（正常使用）
 * - 其他接口：使用全局默认限流
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户注册
   * @param registerDto 注册信息
   * @returns 注册响应
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '注册成功',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '邮箱或用户名已存在',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '参数验证失败' })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * 用户登录
   * @param _loginDto 登录信息
   * @param req Request 对象（由 LocalAuthGuard 注入 user）
   * @param ip 客户端 IP
   * @returns 认证响应
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 1分钟内最多5次（防止暴力破解）
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '登录成功',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '用户名或密码错误',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '参数验证失败' })
  @DisableDatabaseLog() // 登录接口不记录到数据库日志（敏感信息）
  async login(
    @Body() _loginDto: LoginDto,
    @Request() req: any,
    @Ip() ip: string,
  ): Promise<AuthResponseDto> {
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: ip,
    };

    return this.authService.login(req.user as AuthUser, deviceInfo);
  }

  /**
   * 刷新 Token
   * @param refreshTokenDto Refresh Token DTO
   * @param req Request 对象
   * @param ip 客户端 IP
   * @returns 新的认证响应
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 1分钟内最多10次
  @ApiOperation({ summary: '刷新 Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token 刷新成功',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Refresh Token 无效或已过期',
  })
  @DisableDatabaseLog()
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req: any,
    @Ip() ip: string,
  ): Promise<AuthResponseDto> {
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: ip,
    };

    return this.authService.refreshToken(
      refreshTokenDto.refreshToken,
      deviceInfo,
    );
  }

  /**
   * 用户退出登录
   * @param req Request 对象（包含用户信息和 Token）
   * @returns 成功消息
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '退出登录' })
  @ApiResponse({ status: HttpStatus.OK, description: '退出成功' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: '未授权' })
  async logout(@Request() req: any): Promise<{ message: string }> {
    const userId = req.user.userId;

    // 从请求头中提取 Token
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');

    if (accessToken) {
      await this.authService.logout(userId, accessToken);
    }

    return {
      message: '退出登录成功',
    };
  }

  /**
   * 获取当前用户信息
   *
   * 注意：返回的 roles 和 permissions 来自 JWT Token（登录时快照）
   * - 用途：前端 UI 控制（显示/隐藏按钮、菜单等）
   * - 限制：权限变更后需重新登录才能更新
   *
   * 后端安全保障：
   * - RolesGuard 和 PermissionsGuard 会实时查询数据库
   * - 确保权限撤销立即生效，不依赖 Token 中的信息
   * - 即使 Token 中有旧权限，实际接口调用时仍会被拦截
   *
   * @param req Request 对象
   * @returns 用户信息（包含角色和权限）
   */
  @UseGuards(JwtAuthGuard)
  @Post('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: HttpStatus.OK, description: '获取成功' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: '未授权' })
  async getCurrentUser(@Request() req: any) {
    return {
      username: req.user.username,
      email: req.user.email,
      roles: req.user.roles,
      permissions: req.user.permissions,
    };
  }
}
