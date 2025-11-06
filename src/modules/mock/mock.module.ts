import { Module } from '@nestjs/common';
import { MockController } from './controllers/mock.controller';
import { MockProxyController } from './controllers/mock-proxy.controller';
import { MockProxyGuard } from './guards/mock-proxy.guard';
import { MockService } from './services/mock.service';
import { MockEngineService } from './services/mock-engine.service';
import { MockJSEngine } from './engines/mockjs.engine';
import { JsonEngine } from './engines/json.engine';
import { MockLoggerService } from './services/mock-logger.service';
import { MockCacheService } from './services/mock-cache.service';
import { DatabaseModule } from '@/shared/database/database.module';
import { CacheModule } from '@/shared/cache/cache.module';

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
