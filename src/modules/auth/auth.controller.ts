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
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DisableDatabaseLog } from '../../common/decorators/database-log.decorator';

/**
 * 认证控制器
 * 处理用户注册、登录、Token 刷新、退出登录等
 */
@ApiTags('认证管理')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户注册
   * @param registerDto 注册信息
   * @param req Request 对象
   * @param ip 客户端 IP
   * @returns 认证响应
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '注册成功',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '邮箱或用户名已存在',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '参数验证失败' })
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req: any,
    @Ip() ip: string,
  ): Promise<AuthResponseDto> {
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: ip,
    };

    return this.authService.register(registerDto, deviceInfo);
  }

  /**
   * 用户登录
   * @param loginDto 登录信息
   * @param req Request 对象（由 LocalAuthGuard 注入 user）
   * @param ip 客户端 IP
   * @returns 认证响应
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
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

    return this.authService.login(req.user, deviceInfo);
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
   * @param req Request 对象
   * @returns 用户信息
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
      userId: req.user.userId,
      username: req.user.username,
      email: req.user.email,
      roles: req.user.roles,
    };
  }
}
