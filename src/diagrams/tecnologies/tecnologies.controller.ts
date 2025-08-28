import {
  Controller, Get, Post, Body, Param, Patch, Delete, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { TecnologiesService } from './tecnologies.service';
import { CreateTecnologieDto } from './dto/create-tecnologie.dto';
import { UpdateTecnologieDto } from './dto/update-tecnologie.dto';
import { ZONE_KINDS, ZoneKind } from 'src/entities/tecnologie/tecnologie';
import { ApiQuery } from '@nestjs/swagger';

@Controller('tecnologies') // => endpoints: /tecnologies/...
export class TecnologiesController {
  constructor(private readonly service: TecnologiesService) {}

  /**
   * 
   * @param dto: Se asegura que la información que vaya a entrar a la bd sea correcta 
   * @returns crea una nueva tecnología
   */
  @Post()
  create(@Body() dto: CreateTecnologieDto) {
    return this.service.create(dto);
  }

  /**
   * Traer las tecnologías completas o por zonas
   * @param zone: define la zona para que muestre las tecnologias de esa zona
   * @returns retorna todas las tecnologías de la lista o si se agrega de que zona trae todas las tecnologías de esa zona
   */
  @Get()
  @ApiQuery({ name: 'zone', required: false, enum: ZONE_KINDS, description: 'Filtra por zona' })
  @ApiQuery({ name: 'subzone', required: false, description: 'Filtra por subzona (ej: dmz/web)' })
  findAll(@Query('zone') zone?: ZoneKind, @Query('subzone') subzone?: string) {
    return this.service.findAll(zone, subzone);
  }

  /**
   * Traer la tecnologia por nombre
   * @param name: parametro por el que busca la tecnología
   * @returns la tecnología buscada por el nombre
   */
  @Get('by-name/:name')
  findByName(@Param('name') name: string) {
    return this.service.findByName(name);
  }

  /**
   * Traer una tecnología por id
   * @param id parametro por el que se busca la tecnología
   * @returns la tecnología buscada
   */
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  /**
   * 
   * @param id: solicita que el uuid exista 
   * @param dto: permite cambiar cualquiera de los campos ya que son opcionales
   * @returns los cambios que se le hacen a la tecnología
   */
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

