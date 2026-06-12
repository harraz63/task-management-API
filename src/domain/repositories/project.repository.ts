import { Project } from '../entities/project.entity';

export const PROJECT_REPOSITORY = 'PROJECT_REPOSITORY';

export type CreateProjectData = {
  name: string;
  description?: string | null;
  ownerId: string;
};

export type UpdateProjectData = {
  name?: string;
  description?: string | null;
};

export interface ProjectRepository {
  create(data: CreateProjectData): Promise<Project>;
  findById(id: string): Promise<Project | null>;
  findByIdForOwner(id: string, ownerId: string): Promise<Project | null>;
  findMany(): Promise<Project[]>;
  findManyByOwnerId(ownerId: string): Promise<Project[]>;
  update(id: string, data: UpdateProjectData): Promise<Project | null>;
  updateForOwner(
    id: string,
    ownerId: string,
    data: UpdateProjectData,
  ): Promise<Project | null>;
  delete(id: string): Promise<boolean>;
  deleteForOwner(id: string, ownerId: string): Promise<boolean>;
  existsForOwner(id: string, ownerId: string): Promise<boolean>;
}
