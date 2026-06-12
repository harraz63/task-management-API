import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository';
import type {
  UpdateUserData,
  UserRepository,
} from '../../domain/repositories/user.repository';
import { PASSWORD_HASHER } from '../../domain/security/password-hasher.interface';
import type { PasswordHasher } from '../../domain/security/password-hasher.interface';
import { toUserProfile, UserProfile } from '../auth/user-profile.mapper';

type UpdateMeInput = {
  name?: string;
  password?: string;
};

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async updateMe(userId: string, dto: UpdateMeInput): Promise<UserProfile> {
    const data: UpdateUserData = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.password !== undefined) {
      data.passwordHash = await this.passwordHasher.hash(dto.password);
    }

    const user = await this.userRepository.update(userId, data);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return toUserProfile(user);
  }
}
