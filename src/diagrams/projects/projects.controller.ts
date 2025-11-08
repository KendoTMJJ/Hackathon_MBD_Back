import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';

/**
 * Controller for project management operations
 *
 * @remarks
 * Provides RESTful endpoints for project CRUD operations.
 * All operations require JWT authentication and enforce user ownership.
 */
@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('projects')
export class ProjectsController {
  /**
   * Initializes the ProjectsController with service dependency
   *
   * @param projectsService - Service handling project business logic
   */
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * Creates a new project for the authenticated user
   *
   * @param projectName - The name of the project to create
   * @param request - Express request object containing user information
   * @returns The newly created project
   */
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo proyecto' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid project name',
  })
  async create(@Body('name') projectName: string, @Req() request: any) {
    const userSub = request.user.sub;
    return this.projectsService.create(projectName, userSub);
  }

  /**
   * Retrieves all projects owned by the authenticated user
   *
   * @param request - Express request object containing user information
   * @returns Array of projects owned by the user
   */
  @Get()
  @ApiOperation({
    summary: 'Listar todos los proyecto del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
  })
  async list(@Req() request: any) {
    const userSub = request.user.sub;
    return this.projectsService.list(userSub);
  }

  /**
   * Retrieves a specific project by ID with ownership validation
   *
   * @param projectId - The unique identifier of the project
   * @param request - Express request object containing user information
   * @returns The requested project
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un proyecto especifico por ID' })
  @ApiParam({
    name: 'id',
    description: 'Project UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to project',
  })
  async get(@Param('id') projectId: string, @Req() request: any) {
    const userSub = request.user.sub;
    return this.projectsService.get(projectId, userSub);
  }
}
