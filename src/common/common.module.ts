import { Module } from '@nestjs/common';
import { UploadConfigService } from './services/upload-config.service';

/**
 * 通用模块
 * 提供全局可用的服务、装饰器、拦截器等
 */
@Module({
  providers: [UploadConfigService],
  exports: [UploadConfigService],
})
export class CommonModule {}
