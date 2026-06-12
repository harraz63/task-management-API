import { Injectable } from '@nestjs/common';
import type { Project as PrismaProject } from '@prisma/client';
import { Project } from '../../../domain/entities/project.entity';
import {
  CreateProjectData,
  ProjectRepository,
  UpdateProjectData,
} from '../../../domain/repositories/project.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProjectData): Promise<Project> {
    const project = await this.prisma.project.create({
      data,
    });

    return this.toDomain(project);
  }

  async findById(id: string): Promise<Project | null> {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    return project ? this.toDomain(project) : null;
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<Project | null> {
    const project = await this.prisma.project.findFirst({
      where: { id, ownerId },
    });

    return project ? this.toDomain(project) : null;
  }

  async findMany(): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((project) => this.toDomain(project));
  }

  async findManyByOwnerId(ownerId: string): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((project) => this.toDomain(project));
  }

  async update(id: string, data: UpdateProjectData): Promise<Project | null> {
    const project = await this.findById(id);

    if (!project) {
      return null;
    }

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data,
    });

    return this.toDomain(updatedProject);
  }

  async updateForOwner(
    id: string,
    ownerId: string,
    data: UpdateProjectData,
  ): Promise<Project | null> {
    const project = await this.findByIdForOwner(id, ownerId);

    if (!project) {
      return null;
    }

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data,
    });

    return this.toDomain(updatedProject);
  }

  async delete(id: string): Promise<boolean> {
    const project = await this.findById(id);

    if (!project) {
      return false;
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return true;
  }

  async deleteForOwner(id: string, ownerId: string): Promise<boolean> {
    const project = await this.findByIdForOwner(id, ownerId);

    if (!project) {
      return false;
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return true;
  }

  async existsForOwner(id: string, ownerId: string): Promise<boolean> {
    const count = await this.prisma.project.count({
      where: { id, ownerId },
    });

    return count > 0;
  }

  private toDomain(project: PrismaProject): Project {
    return new Project({
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  }
}
