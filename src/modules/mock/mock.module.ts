import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/shared/database/database.module';
import { CacheModule } from '@/shared/cache/cache.module';
import { MockJSEngine } from '@/modules/mock/engines';
import { MockProxyGuard } from './guards/mock-proxy.guard';
import { MockController } from './controllers/mock.controller';
import { MockProxyController } from './controllers/mock-proxy.controller';
import { MockService } from './services/mock.service';
import { MockEngineService } from './services/mock-engine.service';
import { MockLoggerService } from './services/mock-logger.service';
import { MockCacheService } from './services/mock-cache.service';
import { JsonEngine } from './engines/json.engine';

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [MockController, MockProxyController],
  providers: [
    MockService,
    MockEngineService,
    MockJSEngine,
    JsonEngine,
    MockCacheService,
    MockLoggerService,
    MockProxyGuard,
  ],
  exports: [MockService],
})
export class MockModule {}
