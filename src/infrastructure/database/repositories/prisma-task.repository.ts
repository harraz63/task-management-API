import { Injectable } from '@nestjs/common';
import type { Task as PrismaTask } from '@prisma/client';
import { Task } from '../../../domain/entities/task.entity';
import { TaskPriority } from '../../../domain/enums/task-priority.enum';
import { TaskStatus } from '../../../domain/enums/task-status.enum';
import {
  CreateTaskData,
  TaskRepository,
  UpdateTaskData,
} from '../../../domain/repositories/task.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTaskData): Promise<Task> {
    const task = await this.prisma.task.create({
      data,
    });

    return this.toDomain(task);
  }

  async findById(id: string): Promise<Task | null> {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    return task ? this.toDomain(task) : null;
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<Task | null> {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        project: { ownerId },
      },
    });

    return task ? this.toDomain(task) : null;
  }

  async findMany(): Promise<Task[]> {
    const tasks = await this.prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map((task) => this.toDomain(task));
  }

  async findManyForOwner(ownerId: string): Promise<Task[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        project: { ownerId },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map((task) => this.toDomain(task));
  }

  async findManyByProjectForOwner(
    projectId: string,
    ownerId: string,
  ): Promise<Task[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        project: { ownerId },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map((task) => this.toDomain(task));
  }

  async update(id: string, data: UpdateTaskData): Promise<Task | null> {
    const task = await this.findById(id);

    if (!task) {
      return null;
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data,
    });

    return this.toDomain(updatedTask);
  }

  async updateForOwner(
    id: string,
    ownerId: string,
    data: UpdateTaskData,
  ): Promise<Task | null> {
    const task = await this.findByIdForOwner(id, ownerId);

    if (!task) {
      return null;
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data,
    });

    return this.toDomain(updatedTask);
  }

  async delete(id: string): Promise<boolean> {
    const task = await this.findById(id);

    if (!task) {
      return false;
    }

    await this.prisma.task.delete({
      where: { id },
    });

    return true;
  }

  async deleteForOwner(id: string, ownerId: string): Promise<boolean> {
    const task = await this.findByIdForOwner(id, ownerId);

    if (!task) {
      return false;
    }

    await this.prisma.task.delete({
      where: { id },
    });

    return true;
  }

  private toDomain(task: PrismaTask): Task {
    return new Task({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      projectId: task.projectId,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    });
  }
}
