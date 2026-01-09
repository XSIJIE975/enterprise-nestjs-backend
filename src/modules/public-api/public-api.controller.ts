import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Public')
@Controller()
@SkipThrottle()
export class PublicApiController {
  @Get('api')
  @ApiOperation({ summary: 'API信息' })
  @ApiResponse({
    status: 200,
    description: 'API基本信息',
  })
  getApiInfo() {
    return {
      name: 'Enterprise NestJS API',
      description: '企业级NestJS后端API系统',
      docs: '/api/docs',
      timestamp: new Date().toISOString(),
    };
  }
}
