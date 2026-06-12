import { Task } from '../entities/task.entity';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskStatus } from '../enums/task-status.enum';

export const TASK_REPOSITORY = 'TASK_REPOSITORY';

export type CreateTaskData = {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId: string;
  dueDate?: Date | null;
};

export type UpdateTaskData = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
};

export interface TaskRepository {
  create(data: CreateTaskData): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  findByIdForOwner(id: string, ownerId: string): Promise<Task | null>;
  findManyByProjectForOwner(projectId: string, ownerId: string): Promise<Task[]>;
  updateForOwner(
    id: string,
    ownerId: string,
    data: UpdateTaskData,
  ): Promise<Task | null>;
  deleteForOwner(id: string, ownerId: string): Promise<boolean>;
}
