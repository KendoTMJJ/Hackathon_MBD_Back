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
import { SharedEditPermissionGuard } from './shared-access-permission.guard';
import { SheetsService } from '../sheets/sheets.service';
import { CreateSheetDto } from '../sheets/dto/create-sheet.dto';
import { SharedLink } from '../../entities/shared-link/shared-link';
import { SharedAccessGuard, SharedLinkRequest } from './shared-access.guard';

@Controller('shared/:token/sheets')
@UseGuards(SharedAccessGuard)
export class SharedSheetsController {
  constructor(private readonly sheetsService: SheetsService) {}

  @Get()
  async getSheets(@Req() req: SharedLinkRequest) {
    const link: SharedLink = req.sharedLink;
    return this.sheetsService.listByDocumentViaSharedLink(
      link.documentId,
      link,
    );
  }

  @Post()
  @UseGuards(SharedEditPermissionGuard)
  async createSheet(
    @Body() dto: CreateSheetDto,
    @Req() req: SharedLinkRequest,
  ) {
    const link = req.sharedLink;
    try {
      return await this.sheetsService.createViaSharedLink(
        link.documentId,
        dto,
        link,
      );
    } catch (error: any) {
      throw new BadRequestException(`Error creating sheet: ${error.message}`);
    }
  }

  @Delete(':sheetId')
  @UseGuards(SharedEditPermissionGuard)
  async deleteSheet(
    @Param('sheetId') sheetId: string,
    @Req() req: SharedLinkRequest,
  ) {
    const link = req.sharedLink;
    await this.sheetsService.deleteViaSharedLink(sheetId, link);
    return { success: true };
  }

  @Put(':sheetId')
  @UseGuards(SharedEditPermissionGuard)
  async updateSheet(
    @Param('sheetId') sheetId: string,
    @Body() updateData: any,
    @Req() req: SharedLinkRequest,
  ) {
    const link = req.sharedLink;
    return this.sheetsService.updateViaSharedLink(
      sheetId,
      updateData,
      link.documentId,
    );
  }
}
