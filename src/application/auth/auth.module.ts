import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../../presentation/auth/auth.controller';
import { JwtAuthGuard } from '../../presentation/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../presentation/auth/guards/roles.guard';
import { JwtAccessStrategy } from '../../presentation/auth/strategies/jwt-access.strategy';
import { AuthService } from './auth.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt-access' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
