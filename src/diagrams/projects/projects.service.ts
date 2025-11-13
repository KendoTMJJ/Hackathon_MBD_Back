import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Project } from 'src/entities/project/project';
import { DataSource, Repository } from 'typeorm';

/**
 * Service responsible for project management operations
 *
 * @remarks
 * Handles CRUD operations for projects with proper ownership validation.
 * Implements strict access control to ensure users can only access their own projects.
 */
@Injectable()
export class ProjectsService {
  private readonly projectRepository: Repository<Project>;

  /**
   * Initializes the ProjectsService with data source dependency
   *
   * @param dataSource - TypeORM DataSource for database operations
   */
  constructor(private readonly dataSource: DataSource) {
    this.projectRepository = dataSource.getRepository(Project);
  }

  /**
   * Creates a new project for the specified owner
   *
   * @param projectName - The name of the project to create
   * @param ownerSub - The subject identifier of the project owner
   * @returns The newly created project
   */
  async create(projectName: string, ownerSub: string): Promise<Project> {
    const project = this.projectRepository.create({
      name: projectName,
      ownerSub: ownerSub,
    });

    return this.projectRepository.save(project);
  }

  /**
   * Retrieves all projects owned by the specified user
   *
   * @param ownerSub - The subject identifier of the project owner
   * @returns Array of projects ordered by update date (descending)
   */
  async list(ownerSub: string): Promise<Project[]> {
    return this.projectRepository.find({
      where: { ownerSub },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Retrieves a specific project by ID with ownership validation
   *
   * @param projectId - The unique identifier of the project
   * @param userSub - The subject identifier of the user requesting access
   * @returns The requested project
   * @throws {NotFoundException} When project with the given ID is not found
   * @throws {ForbiddenException} When user is not the owner of the project
   */
  async get(projectId: string, userSub: string): Promise<Project> {
    const project = await this.findProjectById(projectId);
    this.validateProjectOwnership(project, userSub);
    return project;
  }

  /**
   * Finds a project by its ID
   *
   * @param projectId - The unique identifier of the project
   * @returns The found project
   * @throws {NotFoundException} When project with the given ID is not found
   */
  private async findProjectById(projectId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  /**
   * Validates that the user is the owner of the project
   *
   * @param project - The project to validate ownership for
   * @param userSub - The subject identifier of the user to validate
   * @throws {ForbiddenException} When user is not the owner of the project
   */
  private validateProjectOwnership(project: Project, userSub: string): void {
    if (project.ownerSub !== userSub) {
      throw new ForbiddenException('Access denied to project');
    }
  }
}
