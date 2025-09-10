import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SheetsService } from './sheets.service';
import { ShareLinksService } from '../shared-link/shared-links.service';
import { CreateSheetDto } from './dto/create-sheet.dto';
import { UpdateSheetDto } from './dto/update-sheet.dto';

@ApiTags('shared-sheets')
@Controller()
export class SharedSheetsController {
  constructor(
    private readonly sheetsService: SheetsService,
    private readonly sharedLinksService: ShareLinksService,
  ) {}

  /** Utilidad para validar el token y checks básicos */
  private async getActiveLinkOrThrow(token: string) {
    if (!token) throw new BadRequestException('Missing shared token');
    const link = await this.sharedLinksService.getByToken(token); // <- implementado abajo
    if (!link) throw new BadRequestException('Invalid shared link token');
    if (!link.isActive) throw new BadRequestException('Shared link is inactive');
    if (link.isExpired) throw new BadRequestException('Shared link has expired');
    if (link.maxUses && link.uses >= link.maxUses) {
      throw new BadRequestException('Shared link usage limit exceeded');
    }
    return link;
  }

  /** === RUTAS QUE USA TU FRONT: /share/... con token en query === */

  @Get('share/documents/:documentId/sheets')
  @ApiOperation({ summary: 'Listar hojas (invitado con token en query)' })
  async listByDocumentShared_q(
    @Param('documentId') documentId: string,
    @Query('token') token: string,
  ) {
    const link = await this.getActiveLinkOrThrow(token);
    return this.sheetsService.listByDocumentViaSharedLink(documentId, link);
  }

  @Post('share/documents/:documentId/sheets')
  @ApiOperation({ summary: 'Crear hoja (invitado con token en query)' })
  async createShared_q(
    @Param('documentId') documentId: string,
    @Query('token') token: string,
    @Body() dto: CreateSheetDto,
  ) {
    const link = await this.getActiveLinkOrThrow(token);
    if (link.minRole !== 'editor') {
      throw new BadRequestException('No edit permission for shared link');
    }
    return this.sheetsService.createViaSharedLink(documentId, dto, link);
  }

  @Patch('share/documents/:documentId/sheets/:sheetId')
  @ApiOperation({ summary: 'Actualizar hoja (invitado con token en query)' })
  async updateShared_q(
    @Param('documentId') documentId: string,
    @Param('sheetId') sheetId: string,
    @Query('token') token: string,
    @Body() dto: UpdateSheetDto,
  ) {
    const link = await this.getActiveLinkOrThrow(token);
    if (link.minRole !== 'editor') {
      throw new BadRequestException('No edit permission for shared link');
    }
    return this.sheetsService.updateViaSharedLink(sheetId, dto, documentId);
  }

  @Delete('share/documents/:documentId/sheets/:sheetId')
  @ApiOperation({ summary: 'Eliminar hoja (invitado con token en query)' })
  async deleteShared_q(
    @Param('documentId') documentId: string,
    @Param('sheetId') sheetId: string,
    @Query('token') token: string,
  ) {
    const link = await this.getActiveLinkOrThrow(token);
    if (link.minRole !== 'editor') {
      throw new BadRequestException('No edit permission for shared link');
    }
    return this.sheetsService.deleteViaSharedLink(sheetId, link);
  }

  /** === Alias opcional: /shared-links/:token/documents/:documentId/sheets === */

  @Get('shared-links/:token/documents/:documentId/sheets')
  async listByDocumentShared_p(
    @Param('token') token: string,
    @Param('documentId') documentId: string,
  ) {
    const link = await this.getActiveLinkOrThrow(token);
    return this.sheetsService.listByDocumentViaSharedLink(documentId, link);
  }

  @Post('shared-links/:token/documents/:documentId/sheets')
  async createShared_p(
    @Param('token') token: string,
    @Param('documentId') documentId: string,
    @Body() dto: CreateSheetDto,
  ) {
    const link = await this.getActiveLinkOrThrow(token);
    if (link.minRole !== 'editor') {
      throw new BadRequestException('No edit permission for shared link');
    }
    return this.sheetsService.createViaSharedLink(documentId, dto, link);
  }

  @Patch('shared-links/:token/documents/:documentId/sheets/:sheetId')
  async updateShared_p(
    @Param('token') token: string,
    @Param('documentId') documentId: string,
    @Param('sheetId') sheetId: string,
    @Body() dto: UpdateSheetDto,
  ) {
    const link = await this.getActiveLinkOrThrow(token);
    if (link.minRole !== 'editor') {
      throw new BadRequestException('No edit permission for shared link');
    }
    return this.sheetsService.updateViaSharedLink(sheetId, dto, documentId);
  }

  @Delete('shared-links/:token/documents/:documentId/sheets/:sheetId')
  async deleteShared_p(
    @Param('token') token: string,
    @Param('documentId') documentId: string,
    @Param('sheetId') sheetId: string,
  ) {
    const link = await this.getActiveLinkOrThrow(token);
    if (link.minRole !== 'editor') {
      throw new BadRequestException('No edit permission for shared link');
    }
    return this.sheetsService.deleteViaSharedLink(sheetId, link);
  }
}
