import { Module, forwardRef } from '@nestjs/common';
import { RepositoriesModule } from '@/shared/repositories/repositories.module';
import { AuthModule } from '../auth/auth.module';
import { LogsModule } from '../logs/logs.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [RepositoriesModule, forwardRef(() => AuthModule), LogsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
