import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ParseBoolPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import {
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

/**
 * Controller for template management operations
 *
 * @remarks
 * Provides RESTful endpoints for template CRUD operations including
 * creation, retrieval, updating, archiving, unarchiving, and deletion.
 * All operations require JWT authentication.
 */
@ApiTags('templates')
@UseGuards(AuthGuard('jwt'))
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  /**
   * Creates a new template
   *
   * @param createTemplateDto - DTO containing template creation data
   * @param request - Express request object containing user information
   * @returns The newly created template
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear una nueva plantilla' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @Post()
  create(@Body() createTemplateDto: CreateTemplateDto, @Req() request: any) {
    const userSub = request.user.sub;
    return this.templatesService.create(createTemplateDto, userSub);
  }

  /**
   * Retrieves a template by its ID
   *
   * @param id - The unique identifier of the template
   * @returns The found template entity
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener una plantilla por id' })
  @ApiResponse({ status: 200, description: 'Template found successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @Get(':id')
  get(@Param('id') id: string) {
    return this.templatesService.get(id);
  }

  /**
   * Lists all templates with optional archived inclusion
   *
   * @param includeArchived - Whether to include archived templates in the results
   * @returns Array of templates ordered by update date
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener todas las plantillas' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  @Get()
  list(
    @Query('includeArchived', new DefaultValuePipe(false), ParseBoolPipe)
    includeArchived: boolean,
  ) {
    return this.templatesService.list(includeArchived);
  }

  /**
   * Updates a template
   *
   * @param id - The unique identifier of the template to update
   * @param updateTemplateDto - DTO containing template update data
   * @returns The updated template entity
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar una plantilla por id' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 409, description: 'Version conflict' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  /**
   * Archives a template (soft delete)
   *
   * @param id - The unique identifier of the template to archive
   * @returns The archived template entity
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archivar una plantilla por id' })
  @ApiResponse({ status: 200, description: 'Template archived successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.templatesService.archive(id);
  }

  /**
   * Unarchives a template
   *
   * @param id - The unique identifier of the template to unarchive
   * @returns The unarchived template entity
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desarchivar una plantilla por id' })
  @ApiResponse({ status: 200, description: 'Template unarchived successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @Post(':id/unarchive')
  unarchive(@Param('id') id: string) {
    return this.templatesService.unarchive(id);
  }

  /**
   * Permanently deletes a template
   *
   * @param id - The unique identifier of the template to delete
   * @returns Confirmation of deletion
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar una plantilla por id' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }
}
