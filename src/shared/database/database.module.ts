import { Global, Module } from '@nestjs/common';
import { ResilienceModule } from '@/shared/resilience/resilience.module';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [ResilienceModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
