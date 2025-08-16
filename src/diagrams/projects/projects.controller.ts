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
import { ProjectsService } from './projects.service';

@UseGuards(AuthGuard('jwt'))
@Controller('projects')
export class ProjectsController {
  constructor(private svc: ProjectsService) {}
  @Post() create(@Body('name') name: string, @Req() req: any) {
    return this.svc.create(name, req.user.sub);
  }
  @Get() list(@Req() req: any) {
    return this.svc.list(req.user.sub);
  }
  @Get(':id') get(@Param('id') id: string, @Req() req: any) {
    return this.svc.get(id, req.user.sub);
  }
}
