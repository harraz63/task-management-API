import { RefreshToken } from '../entities/refresh-token.entity';

export const REFRESH_TOKEN_REPOSITORY = 'REFRESH_TOKEN_REPOSITORY';

export type CreateRefreshTokenData = {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
};

export interface RefreshTokenRepository {
  create(data: CreateRefreshTokenData): Promise<RefreshToken>;
  findById(id: string): Promise<RefreshToken | null>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  revokeById(id: string): Promise<RefreshToken | null>;
  revokeByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  revokeAllForUserId(userId: string): Promise<number>;
}
