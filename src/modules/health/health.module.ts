import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseModule } from '../../shared/database/database.module';
import { CacheModule } from '../../shared/cache/cache.module';

@Module({
  imports: [TerminusModule, DatabaseModule, CacheModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
