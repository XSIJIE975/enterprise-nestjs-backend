import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import type { Prisma } from '@/prisma/prisma/client';
import {
  CreateAuditLogDto,
  QueryApiLogsDto,
  QueryAuditLogsDto,
  QueryErrorLogsDto,
} from './dto/query-logs.dto';

/**
 * 日志服务
 * 处理 API 日志、错误日志、审计日志的 CRUD 操作
 */
@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建 API 日志
   */
  async createApiLog(data: {
    requestId: string;
    userId?: string | null;
    method: string;
    url: string;
    params?: any;
    body?: any;
    response?: any;
    statusCode: number;
    duration: number;
    ip: string;
    userAgent?: string;
    error?: string;
  }) {
    try {
      return await this.prisma.apiLog.create({
        data: {
          requestId: data.requestId,
          userId: data.userId,
          method: data.method,
          url: this.truncateText(data.url, 65535),
          params: data.params,
          body: data.body,
          response: data.response,
          statusCode: data.statusCode,
          duration: data.duration,
          ip: data.ip,
          userAgent: this.truncateText(data.userAgent, 65535),
          error: this.truncateText(data.error, 65535),
        },
      });
    } catch (error) {
      // 日志记录失败不应影响业务
      console.error('Failed to create API log:', error);
      return null;
    }
  }

  /**
   * 查询 API 日志（分页）
   */
  async findApiLogs(query: QueryApiLogsDto) {
    const {
      page = 1,
      pageSize = 20,
      method,
      url,
      statusCode,
      userId,
      startDate,
      endDate,
    } = query;

    const where: Prisma.ApiLogWhereInput = {};

    if (method) {
      where.method = method;
    }

    if (url) {
      where.url = { contains: url };
    }

    if (statusCode) {
      where.statusCode = statusCode;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.apiLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.apiLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 根据 requestId 查询 API 日志
   */
  async findApiLogByRequestId(requestId: string) {
    return this.prisma.apiLog.findFirst({
      where: { requestId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * 创建错误日志
   */
  async createErrorLog(data: {
    requestId?: string | null;
    userId?: string | null;
    errorCode: string;
    message: string;
    stack?: string | null;
    context?: any;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    try {
      return await this.prisma.errorLog.create({
        data: {
          requestId: data.requestId,
          errorCode: data.errorCode,
          message: this.truncateText(data.message, 65535), // TEXT 类型最大 65535 字节
          stack: this.truncateText(data.stack, 65535),
          context: data.context,
          userId: data.userId,
          ip: data.ip,
          userAgent: this.truncateText(data.userAgent, 65535),
        },
      });
    } catch (error) {
      console.error('Failed to create error log:', error);
      return null;
    }
  }

  /**
   * 截断文本到指定长度（字节）
   */
  private truncateText(
    text: string | null | undefined,
    maxBytes: number,
  ): string | null {
    if (!text) return null;

    // 如果文本长度小于最大字节数，直接返回
    if (Buffer.byteLength(text, 'utf8') <= maxBytes) {
      return text;
    }

    // 截断文本并添加省略标记
    let truncated = text;
    while (
      Buffer.byteLength(truncated + '... [truncated]', 'utf8') > maxBytes
    ) {
      truncated = truncated.slice(0, -100); // 每次减少 100 字符
    }

    return truncated + '... [truncated]';
  }

  /**
   * 查询错误日志（分页）
   */
  async findErrorLogs(query: QueryErrorLogsDto) {
    const {
      page = 1,
      pageSize = 20,
      errorCode,
      userId,
      startDate,
      endDate,
    } = query;

    const where: Prisma.ErrorLogWhereInput = {};

    if (errorCode) {
      where.errorCode = errorCode;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.errorLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.errorLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 创建审计日志
   */
  async createAuditLog(data: CreateAuditLogDto) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          oldData: data.oldData ? JSON.stringify(data.oldData) : null,
          newData: data.newData ? JSON.stringify(data.newData) : null,
          ip: data.ip,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }
  }

  /**
   * 查询审计日志（分页）
   */
  async findAuditLogs(query: QueryAuditLogsDto) {
    const {
      page = 1,
      pageSize = 20,
      action,
      resource,
      userId,
      startDate,
      endDate,
    } = query;

    const where: Prisma.AuditLogWhereInput = {};

    if (action) {
      where.action = action;
    }

    if (resource) {
      where.resource = resource;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取日志统计信息
   */
  async getStatistics(startDate?: string, endDate?: string) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [totalApiLogs, totalErrorLogs, totalAuditLogs, statusCodeStats] =
      await Promise.all([
        this.prisma.apiLog.count({ where }),
        this.prisma.errorLog.count({ where }),
        this.prisma.auditLog.count({ where }),
        this.prisma.apiLog.groupBy({
          by: ['statusCode'],
          where,
          _count: {
            id: true,
          },
        }),
      ]);

    return {
      totalApiLogs,
      totalErrorLogs,
      totalAuditLogs,
      statusCodeStats: statusCodeStats.map(stat => ({
        statusCode: stat.statusCode,
        count: stat._count.id,
      })),
    };
  }

  /**
   * 清理旧日志
   * @param retentionDays 保留天数
   */
  async cleanOldLogs(retentionDays: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const [apiLogsDeleted, errorLogsDeleted, auditLogsDeleted] =
      await Promise.all([
        this.prisma.apiLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        }),
        this.prisma.errorLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        }),
        this.prisma.auditLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        }),
      ]);

    return {
      apiLogsDeleted: apiLogsDeleted.count,
      errorLogsDeleted: errorLogsDeleted.count,
      auditLogsDeleted: auditLogsDeleted.count,
    };
  }
}
