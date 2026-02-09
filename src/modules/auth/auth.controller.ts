import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RequestContextService } from '@/shared/request-context/request-context.service';
import { DisableDatabaseLog } from '@/common/decorators/database-log.decorator';
import {
  ApiSuccessResponseDecorator,
  ApiErrorResponseDecorator,
} from '@/common/decorators/swagger-response.decorator';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtUser } from './interfaces/jwt-payload.interface';
import { AuthUser } from './types/user.types';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import { AuthResponseVo, RegisterResponseVo, AuthMeResponseVo } from './vo';

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
  @ApiOperation({ summary: '用户注册' })
  @ApiSuccessResponseDecorator(RegisterResponseVo, {
    status: HttpStatus.CREATED,
    description: '注册成功',
  })
  @ApiErrorResponseDecorator(HttpStatus.CONFLICT, {
    description: '邮箱或用户名已存在',
  })
  @ApiErrorResponseDecorator(HttpStatus.BAD_REQUEST, {
    description: '参数验证失败',
  })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<RegisterResponseVo> {
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
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 1分钟内最多5次（防止暴力破解）
  @ApiOperation({ summary: '用户登录' })
  @ApiSuccessResponseDecorator(AuthResponseVo, {
    status: HttpStatus.OK,
    description: '登录成功',
  })
  @ApiErrorResponseDecorator(HttpStatus.UNAUTHORIZED, {
    description: '用户名或密码错误',
  })
  @ApiErrorResponseDecorator(HttpStatus.BAD_REQUEST, {
    description: '参数验证失败',
  })
  @DisableDatabaseLog() // 登录接口不记录到数据库日志（敏感信息）
  async login(
    @Body() _loginDto: LoginDto,
    @Request() req: any,
    @Ip() ip: string,
  ): Promise<AuthResponseVo> {
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
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 1分钟内最多10次
  @ApiOperation({ summary: '刷新 Token' })
  @ApiSuccessResponseDecorator(AuthResponseVo, {
    status: HttpStatus.OK,
    description: 'Token 刷新成功',
  })
  @ApiErrorResponseDecorator(HttpStatus.UNAUTHORIZED, {
    description: 'Refresh Token 无效或已过期',
  })
  @DisableDatabaseLog()
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req: any,
    @Ip() ip: string,
  ): Promise<AuthResponseVo> {
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '退出登录' })
  @ApiSuccessResponseDecorator(undefined, {
    status: HttpStatus.OK,
    description: '退出成功',
  })
  @ApiErrorResponseDecorator(HttpStatus.UNAUTHORIZED, {
    description: '未授权',
  })
  async logout(@Request() req: any) {
    const userId = req.user.userId;

    // 从请求头中提取 Token
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');

    if (accessToken) {
      await this.authService.logout(userId, accessToken);
    }
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
   * @returns 用户信息（包含角色和权限）
   */
  @UseGuards(JwtAuthGuard)
  @Post('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiSuccessResponseDecorator(AuthMeResponseVo, {
    status: HttpStatus.OK,
    description: '获取成功',
  })
  @ApiErrorResponseDecorator(HttpStatus.UNAUTHORIZED, {
    description: '未授权',
  })
  async getCurrentUser(): Promise<AuthMeResponseVo> {
    const user = RequestContextService.get<JwtUser>('user');
    return {
      username: user.username,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    };
  }
}
