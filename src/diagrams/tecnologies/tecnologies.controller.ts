import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { TecnologiesService } from './tecnologies.service';
import { CreateTecnologieDto } from './dto/create-tecnologie.dto';
import { UpdateTecnologieDto } from './dto/update-tecnologie.dto';
import { ZONE_TYPES, ZoneType } from 'src/entities/tecnologie/tecnology';
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

/**
 * Controller for technology management operations
 *
 * @remarks
 * Provides RESTful endpoints for technology CRUD operations including
 * creation, retrieval by various criteria, updating, deletion, and
 * requirements mapping by zones and subzones.
 */
@ApiTags('technologies')
@Controller('tecnologies')
export class TecnologiesController {
  constructor(private readonly service: TecnologiesService) {}

  /**
   * Creates a new technology
   *
   * @param createTecnologieDto - DTO containing technology creation data
   * @returns The newly created technology
   */
  @ApiOperation({ summary: 'Crear una nueva tecnología' })
  @ApiResponse({ status: 201, description: 'Technology created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @Post()
  create(@Body() createTecnologieDto: CreateTecnologieDto) {
    return this.service.create(createTecnologieDto);
  }

  /**
   * Retrieves all technologies with optional filtering and pagination
   *
   * @param zone - Optional zone type filter
   * @param subzone - Optional subzone filter
   * @param q - Optional search query
   * @param limit - Maximum number of results
   * @param offset - Pagination offset
   * @returns Filtered and paginated list of technologies
   */
  @ApiOperation({
    summary: 'Obtener todas las tecnologías con filtros opcionales',
  })
  @ApiQuery({
    name: 'zone',
    required: false,
    enum: ZONE_TYPES,
    description: 'Filtra por zona',
  })
  @ApiQuery({
    name: 'subzone',
    required: false,
    description: 'Filtra por subzona',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Búsqueda libre (name/description/provider/tags)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    schema: { default: 100 },
    description: 'Máx. resultados',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    schema: { default: 0 },
    description: 'Desplazamiento',
  })
  @ApiResponse({
    status: 200,
    description: 'Technologies retrieved successfully',
  })
  @Get()
  findAll(
    @Query('zone') zone?: ZoneType,
    @Query('subzone') subzone?: string,
    @Query('q') q?: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.service.findAll(zone, subzone, q, limit, offset);
  }

  /**
   * Retrieves a technology by its name
   *
   * @param name - The name of the technology to find
   * @returns The found technology or null
   */
  @ApiOperation({ summary: 'Obtener una tecnología por nombre' })
  @ApiParam({ name: 'name', description: 'Technology name' })
  @ApiResponse({ status: 200, description: 'Technology found successfully' })
  @ApiResponse({ status: 404, description: 'Technology not found' })
  @Get('by-name/:name')
  findByName(@Param('name') name: string) {
    return this.service.findByName(name);
  }

  /**
   * Gets technology requirements mapped by subzone
   *
   * @param zone - Optional zone type filter
   * @param subzones - Optional CSV string of subzones to filter
   * @returns Object mapping subzones to technology requirements
   */
  @ApiOperation({ summary: 'Mapa de requisitos por subzona' })
  @ApiQuery({
    name: 'zone',
    required: false,
    enum: ZONE_TYPES,
    description: 'Filtra por zona principal',
  })
  @ApiQuery({
    name: 'subzones',
    required: false,
    type: String,
    description:
      'CSV con subzonas (p. ej. "dmz-waf,dc-virtual-servers"). Si se indica, filtra el resultado solo a esas subzonas.',
    example: 'dmz-waf,dmz-load-balancer',
  })
  @ApiResponse({
    status: 200,
    description: 'Requirements map retrieved successfully',
  })
  @Get('requirements')
  getRequirements(
    @Query('zone') zone?: ZoneType,
    @Query('subzones') subzones?: string,
  ) {
    const subzoneList = this.parseSubzoneCsv(subzones);
    return this.service.getRequirementsBySubzone(zone, subzoneList);
  }

  /**
   * Retrieves a technology by its ID
   *
   * @param id - The UUID of the technology to find
   * @returns The found technology entity
   */
  @ApiOperation({ summary: 'Obtener una tecnología por ID' })
  @ApiParam({ name: 'id', description: 'Technology UUID' })
  @ApiResponse({ status: 200, description: 'Technology found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Technology not found' })
  @Get('by-id/:id')
  getOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.service.findOne(id);
  }

  /**
   * Updates a technology by its ID
   *
   * @param id - The UUID of the technology to update
   * @param updateTecnologieDto - DTO containing update data
   * @returns The updated technology entity
   */
  @ApiOperation({ summary: 'Actualizar una tecnología por ID' })
  @ApiParam({ name: 'id', description: 'Technology UUID' })
  @ApiResponse({ status: 200, description: 'Technology updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data or UUID' })
  @ApiResponse({ status: 404, description: 'Technology not found' })
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateTecnologieDto: UpdateTecnologieDto,
  ) {
    return this.service.update(id, updateTecnologieDto);
  }

  /**
   * Deletes a technology by its ID
   *
   * @param id - The UUID of the technology to delete
   * @returns Confirmation of deletion
   */
  @ApiOperation({ summary: 'Eliminar una tecnología por ID' })
  @ApiParam({ name: 'id', description: 'Technology UUID' })
  @ApiResponse({ status: 200, description: 'Technology deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Technology not found' })
  @Delete(':id')
  delete(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.service.delete(id);
  }

  /**
   * Parses a CSV string of subzones into an array
   *
   * @param csv - Optional CSV string of subzones
   * @returns Array of trimmed subzone strings or undefined if input is empty
   */
  private parseSubzoneCsv(csv?: string): string[] | undefined {
    if (!csv?.trim()) return undefined;
    return csv
      .split(',')
      .map((subzone) => subzone.trim())
      .filter(Boolean);
  }
}
