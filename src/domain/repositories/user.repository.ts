import { User } from '../entities/user.entity';
import { Role } from '../enums/role.enum';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export type CreateUserData = {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
};

export interface UserRepository {
  create(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}
