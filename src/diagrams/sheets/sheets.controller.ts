import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  Put,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SheetsService } from './sheets.service';
import { CreateSheetDto } from './dto/create-sheet.dto';
import { UpdateSheetDto } from './dto/update-sheet.dto';

@ApiTags('sheets')
@UseGuards(AuthGuard('jwt'))
@Controller('documents')
export class SheetsController {
  constructor(private readonly sheetsService: SheetsService) {}

  @Post(':id/sheets')
  @ApiOperation({ summary: 'Crear nueva hoja en documento' })
  @ApiResponse({ status: 201, description: 'Hoja creada exitosamente' })
  async createSheet(
    @Param('id') documentId: string,
    @Body() dto: CreateSheetDto,
    @Req() req: any,
  ) {
    return this.sheetsService.create(documentId, dto, req.user.sub);
  }

  @Get(':id/sheets')
  @ApiOperation({ summary: 'Listar hojas de un documento' })
  @ApiResponse({ status: 200, description: 'Lista de hojas' })
  async listSheets(@Param('id') documentId: string, @Req() req: any) {
    return this.sheetsService.listByDocument(documentId, req.user.sub);
  }
}

@Controller('documents/sheets')
export class SheetsManagementController {
  constructor(private readonly sheetsService: SheetsService) {}

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Obtener hoja por ID' })
  @ApiResponse({ status: 200, description: 'Datos de la hoja' })
  async getSheet(@Param('id') sheetId: string, @Req() req: any) {
    return this.sheetsService.get(sheetId, req.user.sub);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Actualizar hoja' })
  @ApiResponse({ status: 200, description: 'Hoja actualizada exitosamente' })
  async updateSheet(
    @Param('id') sheetId: string,
    @Body() dto: UpdateSheetDto,
    @Req() req: any,
  ) {
    return this.sheetsService.update(sheetId, dto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Eliminar hoja' })
  @ApiResponse({ status: 200, description: 'Hoja eliminada exitosamente' })
  async deleteSheet(@Param('id') sheetId: string, @Req() req: any) {
    return this.sheetsService.delete(sheetId, req.user.sub);
  }
}

@Controller('documents/:documentId/sheets/reorder')
export class SheetsReorderController {
  constructor(private readonly sheetsService: SheetsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Reordenar hojas de un documento' })
  @ApiResponse({ status: 200, description: 'Hojas reordenadas exitosamente' })
  async reorderSheets(
    @Param('documentId') documentId: string,
    @Body('sheetIds') sheetIds: string[],
    @Req() req: any,
  ) {
    return this.sheetsService.reorder(documentId, sheetIds, req.user.sub);
  }

  @Put(':documentId/sheets/:sheetId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Actualizar hoja específica' })
  @ApiResponse({ status: 200, description: 'Hoja actualizada exitosamente' })
  async updateSheetInDocument(
    @Param('documentId') documentId: string,
    @Param('sheetId') sheetId: string,
    @Body() dto: UpdateSheetDto,
    @Req() req: any,
  ) {
    return this.sheetsService.update(sheetId, dto, req.user.sub);
  }
}
