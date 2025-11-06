import { Injectable, Logger } from '@nestjs/common';
import { IMockLogEntry } from '../interfaces/mock-log.interface';
import { PrismaService } from '@/shared/database/prisma.service';
import { JsonUtil } from '@/common/utils/json.util';
import { MockLogCreateInput } from '@/generated/prisma/models';

@Injectable()
export class MockLoggerService {
  private readonly logger = new Logger('MockLogger');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist mock call log to database (best-effort, swallow errors)
   */
  async log(entry: IMockLogEntry): Promise<void> {
    try {
      const toSave: Record<string, any> = { ...entry };
      if (toSave.query && typeof toSave.query !== 'string') {
        toSave.query = JsonUtil.serializeSafe(toSave.query) || null;
      }
      if (toSave.body && typeof toSave.body !== 'string') {
        toSave.body = JsonUtil.serializeSafe(toSave.body) || null;
      }
      if (toSave.headers && typeof toSave.headers !== 'string') {
        toSave.headers = JsonUtil.serializeSafe(toSave.headers) || null;
      }
      if (toSave.response && typeof toSave.response !== 'string') {
        toSave.response = JsonUtil.serializeSafe(toSave.response) || null;
      }

      await this.prisma.mockLog.create({ data: toSave as MockLogCreateInput });
    } catch (err) {
      // fallback to logger only
      this.logger.debug(`failed to persist mock log: ${String(err)}`);
    }
  }
}
