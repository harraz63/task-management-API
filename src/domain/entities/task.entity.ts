import { TaskPriority } from '../enums/task-priority.enum';
import { TaskStatus } from '../enums/task-status.enum';

export class Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Task) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.status = data.status;
    this.priority = data.priority;
    this.projectId = data.projectId;
    this.dueDate = data.dueDate;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
