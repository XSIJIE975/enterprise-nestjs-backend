import { All, Controller, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { MockProxyGuard } from '../guards/mock-proxy.guard';

@Controller('mock')
@UseGuards(MockProxyGuard)
export class MockProxyController {
  /**
   * Catch-all 路由
   * 使用 @Res() 告诉 NestJS 不要自动处理返回值
   */
  @All('*')
  async handleMockRequest(@Res() _res: Response) {
    // 会经过 MockProxyGuard 处理，Guard 会根据请求的匹配情况返回相应的 Mock 数据
    // 如未匹配到相应的 Mock 数据，Guard 会抛出对应业务错误，此处无需处理任何逻辑
  }
}
