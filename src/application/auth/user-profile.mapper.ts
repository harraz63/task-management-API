import { User } from '../../domain/entities/user.entity';

// Create new user type that does not include the hashed password
export type UserProfile = Omit<User, 'passwordHash'>;

export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
