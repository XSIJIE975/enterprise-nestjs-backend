import { Test, TestingModule } from '@nestjs/testing';
import { LogsService } from './logs.service';
import { PrismaService } from '../../shared/database/prisma.service';

describe('日志服务 - JSON 序列化与数据操作', () => {
  let service: LogsService;

  const mockPrismaService = {
    apiLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
      groupBy: jest.fn(),
    },
    errorLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LogsService>(LogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('创建 API 日志', () => {
    it('应该在创建 API 日志时序列化 JSON 字段', async () => {
      const testData = {
        requestId: 'test-request-id',
        userId: 'user-123',
        method: 'POST',
        url: '/api/users',
        params: { page: 1, limit: 10 },
        body: { name: 'Test User', email: 'test@example.com' },
        response: { success: true, data: { id: 1 } },
        statusCode: 200,
        duration: 150,
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      mockPrismaService.apiLog.create.mockResolvedValue({
        id: 'log-123',
        ...testData,
      });

      await service.createApiLog(testData);

      // 验证 JSON 字段被序列化为字符串
      expect(mockPrismaService.apiLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requestId: testData.requestId,
          params: JSON.stringify(testData.params),
          body: JSON.stringify(testData.body),
          response: JSON.stringify(testData.response),
        }),
      });
    });

    it('应该正确处理空的 JSON 字段', async () => {
      const testData = {
        requestId: 'test-request-id',
        method: 'GET',
        url: '/api/users',
        params: undefined,
        body: undefined,
        response: undefined,
        statusCode: 200,
        duration: 50,
        ip: '127.0.0.1',
      };

      mockPrismaService.apiLog.create.mockResolvedValue({
        id: 'log-123',
        ...testData,
      });

      await service.createApiLog(testData);

      expect(mockPrismaService.apiLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          params: null,
          body: null,
          response: null,
        }),
      });
    });

    it('应该处理包含中文和特殊字符的数据', async () => {
      const testData = {
        requestId: 'test-request-id',
        method: 'POST',
        url: '/api/users',
        body: { name: '张三', message: '测试消息 @#$%' },
        statusCode: 200,
        duration: 100,
        ip: '127.0.0.1',
      };

      mockPrismaService.apiLog.create.mockResolvedValue({ id: 'log-123' });

      await service.createApiLog(testData);

      const createCall = mockPrismaService.apiLog.create.mock.calls[0][0];
      expect(createCall.data.body).toContain('张三');
      expect(createCall.data.body).toContain('测试消息');
    });
  });

  describe('查询 API 日志列表', () => {
    it('应该在查询时反序列化 JSON 字段', async () => {
      const mockLogs = [
        {
          id: 'log-123',
          requestId: 'req-123',
          method: 'POST',
          url: '/api/users',
          params: JSON.stringify({ page: 1 }),
          body: JSON.stringify({ name: 'Test' }),
          response: JSON.stringify({ success: true }),
          statusCode: 200,
          duration: 100,
          ip: '127.0.0.1',
          userId: 'user-123',
          userAgent: 'Mozilla',
          error: null,
          createdAt: new Date(),
          user: null,
        },
      ];

      mockPrismaService.apiLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.apiLog.count.mockResolvedValue(1);

      const result = await service.findApiLogs({ page: 1, pageSize: 20 });

      // 验证返回的数据中 JSON 字段已被反序列化
      expect(result.data[0].params).toEqual({ page: 1 });
      expect(result.data[0].body).toEqual({ name: 'Test' });
      expect(result.data[0].response).toEqual({ success: true });
    });

    it('应该正确处理查询时的空 JSON 字段', async () => {
      const mockLogs = [
        {
          id: 'log-123',
          requestId: 'req-123',
          method: 'GET',
          url: '/api/users',
          params: null,
          body: null,
          response: null,
          statusCode: 200,
          duration: 50,
          ip: '127.0.0.1',
          userId: null,
          userAgent: 'Mozilla',
          error: null,
          createdAt: new Date(),
          user: null,
        },
      ];

      mockPrismaService.apiLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.apiLog.count.mockResolvedValue(1);

      const result = await service.findApiLogs({ page: 1, pageSize: 20 });

      expect(result.data[0].params).toBeNull();
      expect(result.data[0].body).toBeNull();
      expect(result.data[0].response).toBeNull();
    });

    it('应该支持按方法和状态码过滤', async () => {
      mockPrismaService.apiLog.findMany.mockResolvedValue([]);
      mockPrismaService.apiLog.count.mockResolvedValue(0);

      await service.findApiLogs({
        page: 1,
        pageSize: 20,
        method: 'POST',
        statusCode: 200,
      });

      expect(mockPrismaService.apiLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            method: 'POST',
            statusCode: 200,
          }),
        }),
      );
    });

    it('应该正确计算分页信息', async () => {
      mockPrismaService.apiLog.findMany.mockResolvedValue([]);
      mockPrismaService.apiLog.count.mockResolvedValue(25);

      const result = await service.findApiLogs({ page: 2, pageSize: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.pageSize).toBe(10);
      expect(result.meta.total).toBe(25);
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('创建错误日志', () => {
    it('应该序列化 context 字段', async () => {
      const testData = {
        requestId: 'req-123',
        errorCode: 'ERR_500',
        message: 'Internal server error',
        stack: 'Error stack trace...',
        context: {
          method: 'POST',
          url: '/api/users',
          userId: 'user-123',
        },
        userId: 'user-123',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      mockPrismaService.errorLog.create.mockResolvedValue({
        id: 'error-123',
        ...testData,
      });

      await service.createErrorLog(testData);

      expect(mockPrismaService.errorLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          context: JSON.stringify(testData.context),
        }),
      });
    });

    it('应该处理空的 context 字段', async () => {
      const testData = {
        errorCode: 'ERR_500',
        message: 'Error message',
        context: undefined,
      };

      mockPrismaService.errorLog.create.mockResolvedValue({ id: 'error-123' });

      await service.createErrorLog(testData);

      expect(mockPrismaService.errorLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          context: null,
        }),
      });
    });
  });

  describe('创建审计日志', () => {
    it('应该序列化 oldData 和 newData 字段', async () => {
      const testData = {
        userId: 'user-123',
        action: 'UPDATE',
        resource: 'user',
        resourceId: 'user-456',
        oldData: { name: 'Old Name', role: 'user' },
        newData: { name: 'New Name', role: 'admin' },
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'audit-123',
        ...testData,
      });

      await service.createAuditLog(testData);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          oldData: JSON.stringify(testData.oldData),
          newData: JSON.stringify(testData.newData),
        }),
      });
    });

    it('应该处理空的 oldData 和 newData', async () => {
      const testData = {
        userId: 'user-123',
        action: 'CREATE',
        resource: 'user',
        resourceId: 'user-456',
        oldData: undefined,
        newData: { name: 'New User' },
        ip: '127.0.0.1',
      };

      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await service.createAuditLog(testData);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          oldData: null,
          newData: JSON.stringify(testData.newData),
        }),
      });
    });
  });

  describe('查询审计日志列表', () => {
    it('应该反序列化 oldData 和 newData 字段', async () => {
      const mockLogs = [
        {
          id: 'audit-123',
          userId: 'user-123',
          action: 'UPDATE',
          resource: 'user',
          resourceId: 'user-456',
          oldData: JSON.stringify({ role: 'user' }),
          newData: JSON.stringify({ role: 'admin' }),
          ip: '127.0.0.1',
          userAgent: 'Mozilla',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.findAuditLogs({ page: 1, pageSize: 20 });

      expect(result.data[0].oldData).toEqual({ role: 'user' });
      expect(result.data[0].newData).toEqual({ role: 'admin' });
    });

    it('应该支持按操作类型和资源类型过滤', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findAuditLogs({
        page: 1,
        pageSize: 20,
        action: 'UPDATE',
        resource: 'role',
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'UPDATE',
            resource: 'role',
          }),
        }),
      );
    });
  });
});
