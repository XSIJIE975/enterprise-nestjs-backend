import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { Prisma } from '@/prisma/prisma/client';
import type { UserSessionModel } from '@/generated/prisma/models';
import { PrismaService } from '@/shared/database/prisma.service';
import type { SessionRepositoryInterface } from './interfaces/session-repository.interface';

@Injectable()
export class SessionRepository implements SessionRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSessionModel | null> {
    return this.client(tx).userSession.findUnique({ where: { id } });
  }

  async findByTokenId(
    tokenId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSessionModel | null> {
    // 项目当前 UserSession 模型没有 tokenId 字段；
    // 兼容上层约定：以 accessToken / refreshToken 作为 tokenId 进行匹配。
    return this.client(tx).userSession.findFirst({
      where: {
        OR: [{ accessToken: tokenId }, { refreshToken: tokenId }],
      },
    });
  }

  async create(
    data: Prisma.UserSessionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSessionModel> {
    try {
      return await this.client(tx).userSession.create({ data });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async update(
    id: string,
    data: Prisma.UserSessionUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSessionModel> {
    try {
      return await this.client(tx).userSession.update({ where: { id }, data });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async delete(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSessionModel> {
    try {
      return await this.client(tx).userSession.delete({ where: { id } });
    } catch (error) {
      this.handleKnownError(error);
    }
  }

  async findActiveByUserId(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSessionModel[]> {
    return this.client(tx).userSession.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeAllByUserId(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Prisma.BatchPayload> {
    return this.client(tx).userSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });
  }

  async revokeByTokenId(
    tokenId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Prisma.BatchPayload> {
    return this.client(tx).userSession.updateMany({
      where: {
        isActive: true,
        OR: [{ accessToken: tokenId }, { refreshToken: tokenId }],
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });
  }

  private handleKnownError(error: unknown): never {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new NotFoundException('会话不存在');
      }
    }

    throw error;
  }
}
