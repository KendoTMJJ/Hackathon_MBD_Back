// tecnologies.controller.ts
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
import { ZONE_KINDS, ZoneKind } from 'src/entities/tecnologie/tecnologie';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';

@Controller('tecnologies')
export class TecnologiesController {
  constructor(private readonly service: TecnologiesService) {}

  @Post()
  create(@Body() dto: CreateTecnologieDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiQuery({
    name: 'zone',
    required: false,
    enum: ZONE_KINDS,
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
    description: 'Máx. resultados',
    schema: { default: 100 },
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Desplazamiento',
    schema: { default: 0 },
  })
  findAll(
    @Query('zone') zone?: ZoneKind,
    @Query('subzone') subzone?: string,
    @Query('q') q?: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.service.findAll(zone, subzone, q, limit, offset);
  }

  @Get('by-name/:name')
  findByName(@Param('name') name: string) {
    return this.service.findByName(name);
  }

  // --- IMPORTANTE: ruta estática ANTES de dinámicas
  @Get('requirements')
  @ApiOperation({ summary: 'Mapa de requisitos por subzona' })
  @ApiQuery({
    name: 'zone',
    required: false,
    enum: ZONE_KINDS,
    description: 'Si se indica, devuelve solo las subzonas de esa zona',
  })
  @ApiQuery({
    name: 'subzones',
    required: false,
    type: String,
    description:
      'CSV con subzonas (p. ej. "dmz-waf,dc-virtual-servers"). Si se indica, filtra el resultado solo a esas subzonas.',
    example: 'dmz-waf,dmz-load-balancer',
  })
  getRequirements(
    @Query('zone') zone?: ZoneKind,
    @Query('subzones') subzones?: string,
  ) {
    const list =
      typeof subzones === 'string' && subzones.trim()
        ? subzones
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    return this.service.getRequirementsBySubzone(zone, list);
  }

  // ——— SIN REGEX y con prefijo para no chocar con “requirements”
  @Get('by-id/:id')
  getOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.service.findOne(id);
  }

  // Si quieres, puedes dejar PATCH/DELETE en :id (no colisionan con GET)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateTecnologieDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.service.delete(id);
  }
}
