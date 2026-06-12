import { Global, Module } from '@nestjs/common';
import { RedisService } from './cache/redis.service';
import { PrismaModule } from './database/prisma/prisma.module';
import { PrismaService } from './database/prisma/prisma.service';
import { PrismaProjectRepository } from './database/repositories/prisma-project.repository';
import { PrismaRefreshTokenRepository } from './database/repositories/prisma-refresh-token.repository';
import { PrismaTaskRepository } from './database/repositories/prisma-task.repository';
import { PrismaUserRepository } from './database/repositories/prisma-user.repository';
import { PasswordHasherService } from './security/password-hasher.service';
import { PROJECT_REPOSITORY } from '../domain/repositories/project.repository';
import { REFRESH_TOKEN_REPOSITORY } from '../domain/repositories/refresh-token.repository';
import { TASK_REPOSITORY } from '../domain/repositories/task.repository';
import { USER_REPOSITORY } from '../domain/repositories/user.repository';
import { PASSWORD_HASHER } from '../domain/security/password-hasher.interface';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    RedisService,
    PasswordHasherService,
    PrismaUserRepository,
    PrismaProjectRepository,
    PrismaTaskRepository,
    PrismaRefreshTokenRepository,
    {
      provide: PASSWORD_HASHER,
      useExisting: PasswordHasherService,
    },
    {
      provide: USER_REPOSITORY,
      useExisting: PrismaUserRepository,
    },
    {
      provide: PROJECT_REPOSITORY,
      useExisting: PrismaProjectRepository,
    },
    {
      provide: TASK_REPOSITORY,
      useExisting: PrismaTaskRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useExisting: PrismaRefreshTokenRepository,
    },
  ],
  exports: [
    PrismaModule,
    PrismaService,
    RedisService,
    PasswordHasherService,
    PASSWORD_HASHER,
    USER_REPOSITORY,
    PROJECT_REPOSITORY,
    TASK_REPOSITORY,
    REFRESH_TOKEN_REPOSITORY,
  ],
})
export class InfrastructureModule {}
