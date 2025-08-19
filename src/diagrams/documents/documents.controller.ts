import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('documents')
export class DocumentsController {
  constructor(private svc: DocumentsService) {}

  @Post() create(@Body() dto: CreateDocumentDto, @Req() req: any) {
    return this.svc.create(dto, req.user.sub);
  }
  @Get(':id') get(@Param('id') id: string, @Req() req: any) {
    return this.svc.get(id, req.user.sub);
  }
  @Get() list(@Query('projectId') projectId: string, @Req() req: any) {
    return this.svc.listByProject(projectId, req.user.sub);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @Req() req: any,
  ) {
    return this.svc.update(id, dto, req.user.sub);
  }
  @Post(':templateId/clone') clone(
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
  @Get(':id/collaborators') collabs(@Param('id') id: string, @Req() req: any) {
    return this.svc.listCollaborators(id, req.user.sub);
  }

}
