import { Injectable } from '@nestjs/common';
import type { RefreshToken as PrismaRefreshToken } from '@prisma/client';
import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import {
  CreateRefreshTokenData,
  RefreshTokenRepository,
} from '../../../domain/repositories/refresh-token.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    const refreshToken = await this.prisma.refreshToken.create({
      data,
    });

    return this.toDomain(refreshToken);
  }

  async findById(id: string): Promise<RefreshToken | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { id },
    });

    return refreshToken ? this.toDomain(refreshToken) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    return refreshToken ? this.toDomain(refreshToken) : null;
  }

  async revokeById(id: string): Promise<RefreshToken | null> {
    const refreshToken = await this.findById(id);

    if (!refreshToken) {
      return null;
    }

    const revokedRefreshToken = await this.prisma.refreshToken.update({
      where: { id },
      data: { revoked: true },
    });

    return this.toDomain(revokedRefreshToken);
  }

  async revokeByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const refreshToken = await this.findByTokenHash(tokenHash);

    if (!refreshToken) {
      return null;
    }

    const revokedRefreshToken = await this.prisma.refreshToken.update({
      where: { tokenHash },
      data: { revoked: true },
    });

    return this.toDomain(revokedRefreshToken);
  }

  async revokeAllForUserId(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    return result.count;
  }

  private toDomain(refreshToken: PrismaRefreshToken): RefreshToken {
    return new RefreshToken({
      id: refreshToken.id,
      tokenHash: refreshToken.tokenHash,
      userId: refreshToken.userId,
      expiresAt: refreshToken.expiresAt,
      revoked: refreshToken.revoked,
      createdAt: refreshToken.createdAt,
    });
  }
}
