import { Module } from '@nestjs/common';
import { RepositoriesModule } from '@/shared/repositories/repositories.module';
import { LogsModule } from '../logs/logs.module';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';

@Module({
  imports: [RepositoriesModule, LogsModule],
  providers: [PermissionsService],
  controllers: [PermissionsController],
  exports: [PermissionsService],
})
export class PermissionsModule {}
