import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

/**
 * Controller for document management operations
 *
 * @remarks
 * Provides RESTful endpoints for document CRUD operations, cloning, and collaboration management.
 * All operations require JWT authentication and enforce document-level permissions.
 * Supports version control with optimistic locking for concurrent updates.
 */
@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('documents')
export class DocumentsController {
  /**
   * Initializes the DocumentsController with service dependency
   *
   * @param svc - Service handling document business logic and permissions
   */
  constructor(private svc: DocumentsService) {}

  /**
   * Creates a new document in the specified project
   *
   * @param dto - Data transfer object containing document creation parameters
   * @param req - Express request object containing user information
   * @returns The newly created document
   */
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo documento' })
  @ApiResponse({
    status: 201,
    description: 'Document created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to project',
  })
  create(@Body() dto: CreateDocumentDto, @Req() req: any) {
    return this.svc.create(dto, req.user.sub);
  }

  /**
   * Retrieves a specific document by ID with permission validation
   *
   * @param id - The unique identifier of the document
   * @param req - Express request object containing user information
   * @returns The requested document
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un documento especifico por ID' })
  @ApiParam({
    name: 'id',
    description: 'Document UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Document retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to document',
  })
  get(@Param('id') id: string, @Req() req: any) {
    return this.svc.get(id, req.user.sub);
  }

  /**
   * Lists all documents in a project accessible to the user
   *
   * @param projectId - The unique identifier of the project
   * @param req - Express request object containing user information
   * @returns Array of documents in the project
   */
  @Get()
  @ApiOperation({ summary: 'Listar todos los documentos en el proyecto' })
  @ApiQuery({
    name: 'projectId',
    description: 'Project UUID to filter documents',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
  })
  list(@Query('projectId') projectId: string, @Req() req: any) {
    return this.svc.listByProject(projectId, req.user.sub);
  }

  /**
   * Updates a document with version control
   *
   * @param id - The unique identifier of the document to update
   * @param dto - Data transfer object containing update parameters
   * @param req - Express request object containing user information
   * @returns The updated document
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar documento' })
  @ApiParam({
    name: 'id',
    description: 'Document UUID to update',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Document updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to document',
  })
  @ApiResponse({
    status: 409,
    description: 'Version mismatch - document was modified by another user',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @Req() req: any,
  ) {
    return this.svc.update(id, dto, req.user.sub);
  }

  /**
   * Clones a template document to create a new diagram
   *
   * @param templateId - The unique identifier of the template document
   * @param projectId - The unique identifier of the target project
   * @param title - The title for the new document
   * @param req - Express request object containing user information
   * @returns The newly created document clone
   */
  @Post(':templateId/clone')
  @ApiOperation({ summary: 'Clonar una plantilla como documento' })
  @ApiParam({
    name: 'templateId',
    description: 'Template document UUID to clone',
    type: String,
  })
  @ApiQuery({
    name: 'projectId',
    description: 'Target project UUID for the new document',
    required: true,
    type: String,
  })
  @ApiQuery({
    name: 'title',
    description: 'Title for the new document',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Document cloned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Source document is not a template',
  })
  @ApiResponse({
    status: 404,
    description: 'Template document not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to template document',
  })
  clone(
    @Param('templateId') templateId: string,
    @Query('projectId') projectId: string,
    @Query('title') title: string,
    @Req() req: any,
  ) {
    return this.svc.cloneFromTemplate(
      templateId,
      projectId,
      title,
      req.user.sub,
    );
  }

  /**
   * Lists all collaborators for a document
   *
   * @param id - The unique identifier of the document
   * @param req - Express request object containing user information
   * @returns Array of collaborators for the document
   */
  @Get(':id/collaborators')
  @ApiOperation({ summary: 'Listar todos los colaboradores del documento' })
  @ApiParam({
    name: 'id',
    description: 'Document UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Collaborators retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to document',
  })
  collabs(@Param('id') id: string, @Req() req: any) {
    return this.svc.listCollaborators(id, req.user.sub);
  }

  /**
   * Permanently deletes a document and its related data
   *
   * @param id - The unique identifier of the document to delete
   * @param req - Express request object containing user information
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar documento' })
  @ApiParam({
    name: 'id',
    description: 'Document UUID to delete',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Document deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to document',
  })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.remove(id, req.user.sub);
  }
}
