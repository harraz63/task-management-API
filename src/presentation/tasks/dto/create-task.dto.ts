import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { TaskPriority } from '../../../domain/enums/task-priority.enum';
import { TaskStatus } from '../../../domain/enums/task-status.enum';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
