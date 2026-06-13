import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { Role } from '../../domain/enums/role.enum';
import { TaskPriority } from '../../domain/enums/task-priority.enum';
import { TaskStatus } from '../../domain/enums/task-status.enum';
import { PROJECT_REPOSITORY } from '../../domain/repositories/project.repository';
import type { ProjectRepository } from '../../domain/repositories/project.repository';
import { TASK_REPOSITORY } from '../../domain/repositories/task.repository';
import type {
  CreateTaskData,
  TaskRepository,
  UpdateTaskData,
} from '../../domain/repositories/task.repository';
import type { AuthenticatedUser } from '../auth/auth.types';

type CreateTaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId: string;
  dueDate?: string;
};

type UpdateTaskInput = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
};

@Injectable()
export class TasksService {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepository,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  async create(dto: CreateTaskInput, user: AuthenticatedUser): Promise<Task> {
    const project = await this.projectRepository.findByIdForOwner(
      dto.projectId,
      user.id,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const data: CreateTaskData = {
      title: dto.title,
      description: dto.description,
      status: dto.status ?? TaskStatus.TODO,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      projectId: dto.projectId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    };

    return this.taskRepository.create(data);
  }

  findMany(user: AuthenticatedUser): Promise<Task[]> {
    if (user.role === Role.ADMIN) {
      return this.taskRepository.findMany();
    }

    return this.taskRepository.findManyForOwner(user.id);
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Task> {
    const task = await this.findAccessibleTask(id, user);

    return task;
  }

  async update(
    id: string,
    dto: UpdateTaskInput,
    user: AuthenticatedUser,
  ): Promise<Task> {
    const task = await this.findAccessibleTask(id, user);
    const data: UpdateTaskData = {
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    };

    const updatedTask =
      user.role === Role.ADMIN
        ? await this.taskRepository.update(task.id, data)
        : await this.taskRepository.updateForOwner(task.id, user.id, data);

    if (!updatedTask) {
      this.throwNotFound();
    }

    return updatedTask;
  }

  async delete(id: string, user: AuthenticatedUser): Promise<void> {
    const task = await this.findAccessibleTask(id, user);
    const deleted =
      user.role === Role.ADMIN
        ? await this.taskRepository.delete(task.id)
        : await this.taskRepository.deleteForOwner(task.id, user.id);

    if (!deleted) {
      this.throwNotFound();
    }
  }

  private async findAccessibleTask(
    id: string,
    user: AuthenticatedUser,
  ): Promise<Task> {
    const task =
      user.role === Role.ADMIN
        ? await this.taskRepository.findById(id)
        : await this.taskRepository.findByIdForOwner(id, user.id);

    if (!task) {
      this.throwNotFound();
    }

    return task;
  }

  private throwNotFound(): never {
    throw new NotFoundException('Task not found');
  }
}
