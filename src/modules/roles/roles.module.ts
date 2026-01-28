import { Module } from '@nestjs/common';
import { RepositoriesModule } from '@/shared/repositories/repositories.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [RepositoriesModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
