import { Role } from '../../domain/enums/role.enum';
import { UserProfile } from './user-profile.mapper';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResult = AuthTokens & {
  user: UserProfile;
};
