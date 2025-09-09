import {
  Body,
  Controller,
  Get,
  Query,
  Post,
  Patch,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ShareLinksService } from './shared-links.service';
import { CreateShareLinkDto } from './dto/create-shared-link.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('share-links')
export class ShareLinksController {
  constructor(private readonly svc: ShareLinksService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() dto: CreateShareLinkDto, @Req() req: any) {
    return this.svc.create(dto, req.user.sub);
  }

  // 👇 para el modal
  @UseGuards(AuthGuard('jwt'))
  @Get()
  list(@Query('documentId') documentId: string, @Req() req: any) {
    return this.svc.listByDocument(documentId, req.user.sub);
  }

  // Público
  @Get(':slug')
  preview(@Param('slug') slug: string) {
    return this.svc.preview(slug);
  }

  // Aceptar invitación (con login)
  @UseGuards(AuthGuard('jwt'))
  @Post(':slug/accept')
  accept(@Param('slug') slug: string, @Req() req: any) {
    return this.svc.accept(slug, req.user.sub);
  }

  // 👇 revocar
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  revoke(@Param('id') id: string, @Req() req: any) {
    return this.svc.revoke(id, req.user.sub);
  }
}
