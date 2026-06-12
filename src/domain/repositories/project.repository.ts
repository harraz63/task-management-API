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
  findManyByOwnerId(ownerId: string): Promise<Project[]>;
  updateForOwner(
    id: string,
    ownerId: string,
    data: UpdateProjectData,
  ): Promise<Project | null>;
  deleteForOwner(id: string, ownerId: string): Promise<boolean>;
  existsForOwner(id: string, ownerId: string): Promise<boolean>;
}
