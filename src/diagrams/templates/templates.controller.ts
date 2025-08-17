import { Controller, Get, Post, Patch, Param, Delete, UseGuards, Request, HttpStatus } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import { TemplatesService } from "./templates.service"
import { CreateTemplateDto } from "./dto/create-template.dto"
import { UpdateTemplateDto } from "./dto/update-template.dto"
import { Template } from "src/entities/template/template"
import { AuthGuard } from '@nestjs/passport';

@ApiTags("Templates")
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller("templates")
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: "Crear nueva plantilla y documento automáticamente" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Plantilla creada exitosamente",
    type: Template,
  })
  async create(createTemplateDto: CreateTemplateDto, @Request() req: any): Promise<Template> {
    return await this.templatesService.create(createTemplateDto, req.user.sub)
  }

  @Get()
  @ApiOperation({ summary: "Obtener todas las plantillas" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Lista de plantillas",
    type: [Template],
  })
  async findAll(): Promise<Template[]> {
    return await this.templatesService.findAll()
  }

  @Get('my-templates')
  @ApiOperation({ summary: 'Obtener plantillas del usuario actual' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Plantillas del usuario',
    type: [Template] 
  })
  async findMyTemplates(@Request() req: any): Promise<Template[]> {
    return await this.templatesService.findByCreator(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener plantilla por ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Plantilla encontrada',
    type: Template 
  })
  async findOne(@Param('id') id: string): Promise<Template> {
    return await this.templatesService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualizar plantilla" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Plantilla actualizada",
    type: Template,
  })
  async update(@Param('id') id: string, updateTemplateDto: UpdateTemplateDto): Promise<Template> {
    return await this.templatesService.update(id, updateTemplateDto)
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archivar plantilla' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Plantilla archivada',
    type: Template 
  })
  async archive(@Param('id') id: string): Promise<Template> {
    return await this.templatesService.archive(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar plantilla permanentemente' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Plantilla eliminada' 
  })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.templatesService.remove(id);
  }
}
