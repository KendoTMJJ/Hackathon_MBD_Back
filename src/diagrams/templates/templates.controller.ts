// src/diagrams/templates/templates.controller.ts
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

@UseGuards(AuthGuard('jwt'))
@Controller('templates')
export class TemplatesController {
  constructor(private svc: TemplatesService) {}

  @Post()
  create(@Body() dto: CreateTemplateDto, @Req() req: any) {
    return this.svc.create(dto, req.user.sub);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Get()
  list(
    @Query('includeArchived', new DefaultValuePipe(false), ParseBoolPipe)
    includeArchived: boolean,
  ) {
    return this.svc.list(includeArchived);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.svc.update(id, dto);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }

  @Post(':id/unarchive')
  unarchive(@Param('id') id: string) {
    return this.svc.unarchive(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
