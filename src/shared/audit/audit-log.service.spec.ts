import { LogsService } from '@/modules/logs/logs.service';
import { PrismaService } from '@/shared/database/prisma.service';
import { RequestContextService } from '@/shared/request-context/request-context.service';
import { AuditAction, AuditResource } from '@/common/constants/audit.constants';
import { AuditLogService } from './audit-log.service';
import { ResourceAdapterRegistry } from './resource-adapter.registry';

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockLogsService: jest.Mocked<LogsService>;
  let mockPrisma: { auditLog: { createMany: jest.Mock } };
  let mockAdapterRegistry: jest.Mocked<ResourceAdapterRegistry>;

  beforeEach(() => {
    mockLogsService = { createAuditLog: jest.fn() } as any;
    mockPrisma = {
      auditLog: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    mockAdapterRegistry = {
      getAdapter: jest.fn(),
    } as any;

    service = new AuditLogService(
      mockLogsService,
      mockPrisma as unknown as PrismaService,
      mockAdapterRegistry,
    );

    jest.spyOn(RequestContextService, 'getUserId').mockReturnValue('user-1');
    jest.spyOn(RequestContextService, 'getIp').mockReturnValue('127.0.0.1');
    jest.spyOn(RequestContextService, 'getRequestId').mockReturnValue('req-1');
    jest.spyOn(RequestContextService, 'get').mockReturnValue('agent-1');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should extract resourceId from resourceIdArg', async () => {
    const adapter = {
      findById: jest.fn().mockResolvedValue({ id: 'role-1', name: 'role' }),
      findByIds: jest.fn(),
    };
    mockAdapterRegistry.getAdapter.mockReturnValue(adapter as any);

    const options = {
      action: AuditAction.UPDATE,
      resource: AuditResource.role,
      resourceIdArg: 0,
    };

    const originalMethod = jest.fn().mockResolvedValue({ success: true });
    const result = await service.execute(
      options as any,
      originalMethod,
      ['role-1'],
      {},
    );

    expect(result).toEqual({ success: true });
    await flushPromises();

    expect(adapter.findById).toHaveBeenCalledWith('role-1');
    expect(mockLogsService.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: 'role-1',
        action: AuditAction.UPDATE,
        resource: AuditResource.role,
      }),
    );
  });

  it('should extract resourceId from resourceIdPath', async () => {
    mockAdapterRegistry.getAdapter.mockReturnValue({
      findById: jest.fn().mockResolvedValue({ id: 'user-9', name: 'User' }),
      findByIds: jest.fn(),
    } as any);

    const options = {
      action: AuditAction.UPDATE,
      resource: AuditResource.user,
      resourceIdPath: 'payload.user.id',
    };

    await service.execute(
      options as any,
      jest.fn().mockResolvedValue({ ok: true }),
      [{ payload: { user: { id: 'user-9' } } }],
      {},
    );

    await flushPromises();

    expect(mockLogsService.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'user-9' }),
    );
  });

  it('should extract resourceId from resourceIdFromResult', async () => {
    mockAdapterRegistry.getAdapter.mockReturnValue({
      findById: jest.fn().mockResolvedValue({ id: 'perm-3' }),
      findByIds: jest.fn(),
    } as any);

    const options = {
      action: AuditAction.CREATE,
      resource: AuditResource.permission,
      resourceIdFromResult: 'data.id',
    };

    await service.execute(
      options as any,
      jest.fn().mockResolvedValue({ data: { id: 'perm-3' } }),
      [],
      {},
    );

    await flushPromises();

    expect(mockLogsService.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'perm-3' }),
    );
  });

  it('should fetch oldData via adapter', async () => {
    const adapter = {
      findById: jest.fn().mockResolvedValue({ id: 'role-2', name: 'Role' }),
      findByIds: jest.fn(),
    };
    mockAdapterRegistry.getAdapter.mockReturnValue(adapter as any);

    const options = {
      action: AuditAction.DELETE,
      resource: AuditResource.role,
      resourceIdArg: 0,
    };

    await service.execute(
      options as any,
      jest.fn().mockResolvedValue({ deleted: true }),
      ['role-2'],
      {},
    );

    await flushPromises();

    expect(adapter.findById).toHaveBeenCalledWith('role-2');
    expect(mockLogsService.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        oldData: { id: 'role-2', name: 'Role' },
      }),
    );
  });

  it('should skip logging when condition returns false', async () => {
    // Mock adapter for UPDATE operation (oldData will be fetched regardless of condition)
    const adapter = {
      findById: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Old User' }),
      findByIds: jest.fn(),
    };
    mockAdapterRegistry.getAdapter.mockReturnValue(adapter as any);

    const condition = jest.fn().mockReturnValue(false);
    const options = {
      action: AuditAction.UPDATE,
      resource: AuditResource.user,
      resourceIdArg: 0,
      condition,
    };

    await service.execute(
      options as any,
      jest.fn().mockResolvedValue({ ok: true }),
      ['user-1'],
      {},
    );

    await flushPromises();

    // oldData is fetched before originalMethod execution
    expect(adapter.findById).toHaveBeenCalledWith('user-1');
    // condition is called after originalMethod execution
    expect(condition).toHaveBeenCalled();
    // createAuditLog is NOT called because condition returned false
    expect(mockLogsService.createAuditLog).not.toHaveBeenCalled();
  });

  it('should create multiple logs for batch operations', async () => {
    const adapter = {
      findByIds: jest.fn().mockResolvedValue([
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
      ]),
      findById: jest.fn(),
    };
    mockAdapterRegistry.getAdapter.mockReturnValue(adapter as any);

    const options = {
      action: AuditAction.BATCH_DELETE,
      resource: AuditResource.user,
      resourceIdArg: 0,
      batch: true,
    };

    await service.execute(
      options as any,
      jest.fn().mockResolvedValue({ success: true }),
      [['1', '2']],
      {},
    );

    await flushPromises();

    expect(adapter.findByIds).toHaveBeenCalledWith(['1', '2']);
    const call = mockPrisma.auditLog.createMany.mock.calls[0][0];
    expect(call.data).toHaveLength(2);
    expect(call.data[0]).toEqual(
      expect.objectContaining({ resourceId: '1', requestId: 'req-1' }),
    );
    expect(call.data[1]).toEqual(
      expect.objectContaining({ resourceId: '2', requestId: 'req-1' }),
    );
  });

  it('should include RequestContext values in logs', async () => {
    mockAdapterRegistry.getAdapter.mockReturnValue({
      findById: jest.fn().mockResolvedValue({ id: 'role-5' }),
      findByIds: jest.fn(),
    } as any);

    const options = {
      action: AuditAction.UPDATE,
      resource: AuditResource.role,
      resourceIdArg: 0,
    };

    await service.execute(
      options as any,
      jest.fn().mockResolvedValue({ ok: true }),
      ['role-5'],
      {},
    );

    await flushPromises();

    expect(mockLogsService.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        ip: '127.0.0.1',
        requestId: 'req-1',
        userAgent: 'agent-1',
      }),
    );
  });

  it('should log even when adapter is missing', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockAdapterRegistry.getAdapter.mockImplementation(() => {
      throw new Error('no adapter');
    });

    const options = {
      action: AuditAction.UPDATE,
      resource: AuditResource.role,
      resourceIdArg: 0,
    };

    await service.execute(
      options as any,
      jest.fn().mockResolvedValue({ ok: true }),
      ['role-9'],
      {},
    );

    await flushPromises();

    expect(consoleSpy).toHaveBeenCalled();
    expect(mockLogsService.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ oldData: undefined }),
    );
  });

  it('should not throw when prisma createMany fails', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockPrisma.auditLog.createMany.mockRejectedValueOnce(
      new Error('db failure'),
    );
    mockAdapterRegistry.getAdapter.mockReturnValue({
      findById: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
    } as any);

    const options = {
      action: AuditAction.UPDATE,
      resource: AuditResource.role,
      resourceIdArg: 0,
      batch: true,
    };

    await expect(
      service.execute(
        options as any,
        jest.fn().mockResolvedValue({ ok: true }),
        [['1', '2']],
        {},
      ),
    ).resolves.toEqual({ ok: true });

    await flushPromises();

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should pass args and context into condition', async () => {
    mockAdapterRegistry.getAdapter.mockReturnValue({
      findById: jest.fn().mockResolvedValue({ id: 'user-99' }),
      findByIds: jest.fn(),
    } as any);

    const condition = jest.fn().mockReturnValue(true);
    const options = {
      action: AuditAction.UPDATE,
      resource: AuditResource.user,
      resourceIdArg: 0,
      condition,
    };

    const args = ['user-99', { name: 'Neo' }];
    const context = { label: 'ctx' };
    const result = { updated: true };

    await service.execute(
      options as any,
      jest.fn().mockResolvedValue(result),
      args,
      context,
    );

    await flushPromises();

    expect(condition).toHaveBeenCalledWith(args, result, context);
    expect(mockLogsService.createAuditLog).toHaveBeenCalled();
  });
});
