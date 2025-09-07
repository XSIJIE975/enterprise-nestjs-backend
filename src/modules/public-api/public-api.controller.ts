import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Public')
@Controller() // 移除controller路径，使其处理根路径
export class PublicApiController {
  @Get()
  @ApiOperation({ summary: 'API根路径' })
  @ApiResponse({
    status: 200,
    description: 'API欢迎信息',
  })
  getWelcome() {
    return {
      message: '欢迎访问企业级NestJS API',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/api/v1/health',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('api')
  @ApiOperation({ summary: 'API信息' })
  @ApiResponse({
    status: 200,
    description: 'API基本信息',
  })
  getApiInfo() {
    return {
      name: 'Enterprise NestJS API',
      version: '1.0.0',
      description: '企业级NestJS后端API系统',
      docs: '/api/docs',
      endpoints: {
        health: '/api/v1/health',
        auth: '/api/v1/auth',
        users: '/api/v1/users',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
