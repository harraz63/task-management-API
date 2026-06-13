import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from '../../application/tasks/tasks.service';
import type { AuthenticatedUser } from '../../application/auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto, user);
  }

  @Get()
  findMany(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.findMany(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.delete(id, user);
  }
}
