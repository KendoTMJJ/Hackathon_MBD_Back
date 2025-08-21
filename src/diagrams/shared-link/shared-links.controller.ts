import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SharedLinksService } from './shared-links.service';
import { CreateShareLinkDto } from './dto/create-shared-link.dto';

@ApiTags('shared-links')
@Controller()
export class SharedLinksController {
  constructor(private readonly sharedLinksService: SharedLinksService) {}

  @Post('documents/:id/share')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Crear link compartido' })
  @ApiResponse({ status: 201, description: 'Link creado exitosamente' })
  async createShare(
    @Param('id') documentId: string,
    @Body() dto: CreateShareLinkDto,
    @Req() req: any,
  ) {
    return this.sharedLinksService.create(documentId, dto, req.user.sub);
  }

  @Get('documents/:id/shares')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Listar links compartidos' })
  @ApiResponse({ status: 200, description: 'Lista de links' })
  async listShares(@Param('id') documentId: string, @Req() req: any) {
    return this.sharedLinksService.listByDocument(documentId, req.user.sub);
  }

  @Delete('documents/shares/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Revocar link compartido' })
  @ApiResponse({ status: 200, description: 'Link revocado exitosamente' })
  async revokeShare(@Param('id') linkId: string, @Req() req: any) {
    return this.sharedLinksService.revoke(linkId, req.user.sub);
  }
}
