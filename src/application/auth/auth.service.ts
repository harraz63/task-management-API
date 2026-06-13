import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { User } from '../../domain/entities/user.entity';
import { Role } from '../../domain/enums/role.enum';
import { REFRESH_TOKEN_REPOSITORY } from '../../domain/repositories/refresh-token.repository';
import type { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { PASSWORD_HASHER } from '../../domain/security/password-hasher.interface';
import type { PasswordHasher } from '../../domain/security/password-hasher.interface';
import { AuthTokens, LoginResult } from './auth.types';
import { toUserProfile, UserProfile } from './user-profile.mapper';

type JwtExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterInput): Promise<UserProfile> {
    const existingUser = await this.userRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const user = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      // Registration never be an ADMIN
      role: Role.USER,
    });

    // Return the user profile without the hashed password
    return toUserProfile(user);
  }

  async login(dto: LoginInput): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.passwordHasher.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokenPair(user);

    return {
      ...tokens,
      user: toUserProfile(user),
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);
    const storedToken =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (
      !storedToken ||
      storedToken.revoked ||
      storedToken.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findById(storedToken.userId);

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.refreshTokenRepository.revokeById(storedToken.id);

    return this.issueTokenPair(user);
  }

  async logout(refreshToken: string, userId: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const storedToken =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (storedToken?.userId === userId && !storedToken.revoked) {
      await this.refreshTokenRepository.revokeById(storedToken.id);
    }
  }

  async validateUser(userId: string): Promise<UserProfile> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return toUserProfile(user);
  }

  private async issueTokenPair(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.getRequiredConfig('JWT_ACCESS_SECRET'),
      expiresIn: this.getJwtExpiresIn('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    // get the refresh token expiration time
    const refreshExpiresIn = this.getJwtExpiresIn(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.getRequiredConfig('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn,
    });

    await this.refreshTokenRepository.create({
      tokenHash: this.hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + this.toMilliseconds(refreshExpiresIn)),
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`${key} is required`);
    }

    return value;
  }

  private getJwtExpiresIn(key: string, defaultValue: string): JwtExpiresIn {
    const value = this.configService.get<string>(key) ?? defaultValue;
    const trimmedValue = value.trim();

    if (/^\d+$/.test(trimmedValue)) {
      return Number(trimmedValue);
    }

    return trimmedValue as JwtExpiresIn;
  }

  private toMilliseconds(expiresIn: JwtExpiresIn): number {
    if (typeof expiresIn === 'number') {
      return expiresIn * 1000;
    }

    const match = /^(\d+)(ms|s|m|h|d|w)$/i.exec(expiresIn.trim());

    if (!match) {
      throw new Error(`Unsupported JWT expiration value: ${expiresIn}`);
    }

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }
}
