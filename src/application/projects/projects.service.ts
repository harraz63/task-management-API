import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../../domain/enums/role.enum';
import { Project } from '../../domain/entities/project.entity';
import { PROJECT_REPOSITORY } from '../../domain/repositories/project.repository';
import type {
  CreateProjectData,
  ProjectRepository,
  UpdateProjectData,
} from '../../domain/repositories/project.repository';
import { RedisService } from '../../infrastructure/cache/redis.service';
import type { AuthenticatedUser } from '../auth/auth.types';

type CreateProjectInput = {
  name: string;
  description?: string;
};

type UpdateProjectInput = {
  name?: string;
  description?: string;
};

const PROJECT_CACHE_TTL_SECONDS = 300;

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
    private readonly redisService: RedisService,
  ) {}

  create(dto: CreateProjectInput, user: AuthenticatedUser): Promise<Project> {
    const data: CreateProjectData = {
      name: dto.name,
      description: dto.description,
      ownerId: user.id,
    };

    return this.projectRepository.create(data);
  }

  findMany(user: AuthenticatedUser): Promise<Project[]> {
    if (user.role === Role.ADMIN) {
      return this.projectRepository.findMany();
    }

    return this.projectRepository.findManyByOwnerId(user.id);
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Project> {
    if (user.role !== Role.ADMIN) {
      const cacheKey = this.cacheKey(user.id, id);
      const cachedProject = await this.redisService.get<Project>(cacheKey);

      if (cachedProject) {
        return cachedProject;
      }

      const project = await this.projectRepository.findByIdForOwner(
        id,
        user.id,
      );

      if (!project) {
        this.throwNotFound();
      }

      await this.redisService.set(cacheKey, project, PROJECT_CACHE_TTL_SECONDS);

      return project;
    }

    const project = await this.projectRepository.findById(id);

    if (!project) {
      this.throwNotFound();
    }

    const cacheKey = this.cacheKey(project.ownerId, id);
    const cachedProject = await this.redisService.get<Project>(cacheKey);

    if (cachedProject) {
      return cachedProject;
    }

    await this.redisService.set(cacheKey, project, PROJECT_CACHE_TTL_SECONDS);

    return project;
  }

  async update(
    id: string,
    dto: UpdateProjectInput,
    user: AuthenticatedUser,
  ): Promise<Project> {
    const project = await this.findAccessibleProject(id, user);
    const data: UpdateProjectData = {
      name: dto.name,
      description: dto.description,
    };
    const updatedProject = await this.projectRepository.update(id, data);

    if (!updatedProject) {
      this.throwNotFound();
    }

    await this.redisService.del(this.cacheKey(project.ownerId, id));

    return updatedProject;
  }

  async delete(id: string, user: AuthenticatedUser): Promise<void> {
    const project = await this.findAccessibleProject(id, user);
    const deleted = await this.projectRepository.delete(id);

    if (!deleted) {
      this.throwNotFound();
    }

    await this.redisService.del(this.cacheKey(project.ownerId, id));
  }

  private async findAccessibleProject(
    id: string,
    user: AuthenticatedUser,
  ): Promise<Project> {
    const project =
      user.role === Role.ADMIN
        ? await this.projectRepository.findById(id)
        : await this.projectRepository.findByIdForOwner(id, user.id);

    if (!project) {
      this.throwNotFound();
    }

    return project;
  }

  private cacheKey(ownerId: string, projectId: string): string {
    return `project:${ownerId}:${projectId}`;
  }

  private throwNotFound(): never {
    // Return 404 for missing or unauthorized projects to avoid leaking whether another user's resource exists.
    throw new NotFoundException('Project not found');
  }
}
