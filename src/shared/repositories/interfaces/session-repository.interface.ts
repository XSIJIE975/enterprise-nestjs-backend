import type { Prisma } from '@/prisma/prisma/client';
import type { UserSessionModel } from '@/generated/prisma/models';

export interface SessionRepositoryInterface {
  findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSessionModel | null>;

  /**
   * tokenId 为上层约定的 token 标识。
   * 当前实现兼容 accessToken / refreshToken 两种匹配。
   */
  findByTokenId(
    tokenId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSessionModel | null>;

  create(
    data: Prisma.UserSessionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSessionModel>;

  update(
    id: string,
    data: Prisma.UserSessionUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSessionModel>;

  delete(id: string, tx?: Prisma.TransactionClient): Promise<UserSessionModel>;

  findActiveByUserId(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserSessionModel[]>;

  revokeAllByUserId(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Prisma.BatchPayload>;

  revokeByTokenId(
    tokenId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Prisma.BatchPayload>;
}
