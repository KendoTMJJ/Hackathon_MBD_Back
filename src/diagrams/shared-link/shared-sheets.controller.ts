import {
  Controller,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
  Delete,
  Post,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { SharedAccessGuard } from './shared-access.guard';
import { SheetsService } from '../sheets/sheets.service';
import { CreateSheetDto } from '../sheets/dto/create-sheet.dto';

@Controller('shared/:token/sheets')
@UseGuards(SharedAccessGuard)
export class SharedSheetsController {
  constructor(private readonly sheetsService: SheetsService) {}

  @Get()
  async getSheets(@Req() req: any) {
    const sharedLink = req.sharedLink;
    console.log('Getting sheets for shared document:', sharedLink.documentId);
    
    try {
      return await this.sheetsService.listByDocumentViaSharedLink(
        sharedLink.documentId,
        sharedLink,
      );
    } catch (error) {
      console.error('Error getting sheets via shared link:', error);
      throw new BadRequestException(`Error retrieving sheets: ${error.message}`);
    }
  }

  @Post()
  async createSheet(@Body() dto: CreateSheetDto, @Req() req: any) {
    const sharedLink = req.sharedLink;
    
    const documentId = sharedLink.documentId || sharedLink.document?.id;
    
    console.log('CreateSheet request:', { 
      dto, 
      extractedDocumentId: documentId,
      sharedLink: { 
        id: sharedLink.id, 
        documentId: sharedLink.documentId,
        document: sharedLink.document ? { id: sharedLink.document.id } : null,
        permission: sharedLink.permission 
      } 
    });

    if (sharedLink.permission !== 'edit') {
      throw new BadRequestException(
        'No tienes permisos para crear hojas en este documento',
      );
    }

    if (!documentId) {
      throw new BadRequestException('Document ID not found in shared link');
    }

    try {
      const result = await this.sheetsService.createViaSharedLink(
        documentId, 
        dto,
        sharedLink,
      );
      console.log('Sheet created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating sheet via shared link:', error);
      throw new BadRequestException(`Error creating sheet: ${error.message}`);
    }
  }

  @Delete(':sheetId')
  async deleteSheet(@Param('sheetId') sheetId: string, @Req() req: any) {
    const sharedLink = req.sharedLink;

    if (sharedLink.permission !== 'edit') {
      throw new BadRequestException(
        'No tienes permisos para eliminar hojas en este documento',
      );
    }

    try {
      await this.sheetsService.deleteViaSharedLink(sheetId, sharedLink);
      return { success: true };
    } catch (error) {
      console.error('Error deleting sheet via shared link:', error);
      throw new BadRequestException(`Error deleting sheet: ${error.message}`);
    }
  }

  @Put(':sheetId')
  async updateSheet(
    @Param('sheetId') sheetId: string,
    @Body() updateData: any,
    @Req() req: any,
  ) {
    const sharedLink = req.sharedLink;

    if (sharedLink.permission !== 'edit') {
      throw new BadRequestException(
        'No tienes permisos para editar hojas en este documento',
      );
    }

    try {
      return await this.sheetsService.updateViaSharedLink(
        sheetId,
        updateData,
        sharedLink.documentId,
      );
    } catch (error) {
      console.error('Error updating sheet via shared link:', error);
      throw new BadRequestException(`Error updating sheet: ${error.message}`);
    }
  }
}