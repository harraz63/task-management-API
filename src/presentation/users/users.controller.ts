import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from '../../application/users/users.service';
import type { AuthenticatedUser } from '../../application/auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateMeDto } from './dto/update-me.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.id, dto);
  }
}
