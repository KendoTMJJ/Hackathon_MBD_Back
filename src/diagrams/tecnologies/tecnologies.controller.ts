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
import { ApiQuery } from '@nestjs/swagger';

@Controller('tecnologies') // <- si quieres inglés, cámbialo a 'technologies'
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

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTecnologieDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.delete(id);
  }
}
