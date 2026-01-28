import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ResilienceModule } from '@/shared/resilience/resilience.module';

@Global()
@Module({
  imports: [ResilienceModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
