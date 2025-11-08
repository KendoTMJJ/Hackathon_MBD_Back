import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SheetsService } from './sheets.service';
import { ShareLinksService } from '../shared-link/shared-links.service';
import { CreateSheetDto } from './dto/create-sheet.dto';
import { UpdateSheetDto } from './dto/update-sheet.dto';

/**
 * Controller for shared sheet operations using query token parameter
 * Provides endpoints for sheet management via shared links with token in query string
 */
@ApiTags('shared-sheets')
@Controller()
export class SharedSheetsController {
  constructor(
    private readonly sheetsService: SheetsService,
    private readonly sharedLinksService: ShareLinksService,
  ) {}

  /**
   * Validates the shared token and checks basic access conditions
   * @param token - The shared link token to validate
   * @returns The validated shared link object
   * @throws {BadRequestException} When token is invalid or access conditions are not met
   */
  private async getActiveLinkOrThrow(token: string) {
    if (!token) throw new BadRequestException('Missing shared token');
    const link = await this.sharedLinksService.getByToken(token);
    if (!link) throw new BadRequestException('Invalid shared link token');
    if (!link.isActive)
      throw new BadRequestException('Shared link is inactive');
    if (link.isExpired)
      throw new BadRequestException('Shared link has expired');
    if (link.maxUses && link.uses >= link.maxUses) {
      throw new BadRequestException('Shared link usage limit exceeded');
    }
    return link;
  }

  /** === ROUTES USING /share/... WITH TOKEN IN QUERY === */

  /**
   * Lists sheets in a document via shared link with token in query
   * @param documentId - The document ID to list sheets from
   * @param token - Shared link token for access validation
   * @returns Array of sheets in the document
   */
  @Get('share/documents/:documentId/sheets')
  @ApiOperation({ summary: 'List sheets (guest access with query token)' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiQuery({ name: 'token', description: 'Shared link token' })
  @ApiResponse({ status: 200, description: 'Sheets retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async listByDocumentShared_q(
    @Param('documentId') documentId: string,
    @Query('token') token: string,
  ) {
    const link = await this.getActiveLinkOrThrow(token);
    return this.sheetsService.listByDocumentViaSharedLink(documentId, link);
  }

  /**
   * Creates a sheet via shared link with token in query
   * @param documentId - The document ID where the sheet will be created
   * @param token - Shared link token for access validation
   * @param dto - Data for creating the sheet
   * @returns The created sheet
   */
  @Post('share/documents/:documentId/sheets')
  @ApiOperation({ summary: 'Create sheet (guest access with query token)' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiQuery({ name: 'token', description: 'Shared link token' })
  @ApiResponse({ status: 201, description: 'Sheet created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or insufficient permissions',
  })
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

  /**
   * Updates a sheet via shared link with token in query
   * @param documentId - The document ID containing the sheet
   * @param sheetId - The sheet ID to update
   * @param token - Shared link token for access validation
   * @param dto - Data for updating the sheet
   * @returns The updated sheet
   */
  @Patch('share/documents/:documentId/sheets/:sheetId')
  @ApiOperation({ summary: 'Update sheet (guest access with query token)' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiParam({ name: 'sheetId', description: 'Sheet ID' })
  @ApiQuery({ name: 'token', description: 'Shared link token' })
  @ApiResponse({ status: 200, description: 'Sheet updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or insufficient permissions',
  })
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

  /**
   * Deletes a sheet via shared link with token in query
   * @param documentId - The document ID containing the sheet
   * @param sheetId - The sheet ID to delete
   * @param token - Shared link token for access validation
   * @returns Confirmation of deletion
   */
  @Delete('share/documents/:documentId/sheets/:sheetId')
  @ApiOperation({ summary: 'Delete sheet (guest access with query token)' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiParam({ name: 'sheetId', description: 'Sheet ID' })
  @ApiQuery({ name: 'token', description: 'Shared link token' })
  @ApiResponse({ status: 200, description: 'Sheet deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or insufficient permissions',
  })
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

  /** === OPTIONAL ALIAS: /shared-links/:token/documents/:documentId/sheets === */

  /**
   * Lists sheets in a document via shared link with token in path
   * @param token - Shared link token for access validation
   * @param documentId - The document ID to list sheets from
   * @returns Array of sheets in the document
   */
  @Get('shared-links/:token/documents/:documentId/sheets')
  @ApiOperation({ summary: 'List sheets (guest access with path token)' })
  @ApiParam({ name: 'token', description: 'Shared link token' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Sheets retrieved successfully' })
  async listByDocumentShared_p(
    @Param('token') token: string,
    @Param('documentId') documentId: string,
  ) {
    const link = await this.getActiveLinkOrThrow(token);
    return this.sheetsService.listByDocumentViaSharedLink(documentId, link);
  }

  /**
   * Creates a sheet via shared link with token in path
   * @param token - Shared link token for access validation
   * @param documentId - The document ID where the sheet will be created
   * @param dto - Data for creating the sheet
   * @returns The created sheet
   */
  @Post('shared-links/:token/documents/:documentId/sheets')
  @ApiOperation({ summary: 'Create sheet (guest access with path token)' })
  @ApiParam({ name: 'token', description: 'Shared link token' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 201, description: 'Sheet created successfully' })
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

  /**
   * Updates a sheet via shared link with token in path
   * @param token - Shared link token for access validation
   * @param documentId - The document ID containing the sheet
   * @param sheetId - The sheet ID to update
   * @param dto - Data for updating the sheet
   * @returns The updated sheet
   */
  @Patch('shared-links/:token/documents/:documentId/sheets/:sheetId')
  @ApiOperation({ summary: 'Update sheet (guest access with path token)' })
  @ApiParam({ name: 'token', description: 'Shared link token' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiParam({ name: 'sheetId', description: 'Sheet ID' })
  @ApiResponse({ status: 200, description: 'Sheet updated successfully' })
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

  /**
   * Deletes a sheet via shared link with token in path
   * @param token - Shared link token for access validation
   * @param documentId - The document ID containing the sheet
   * @param sheetId - The sheet ID to delete
   * @returns Confirmation of deletion
   */
  @Delete('shared-links/:token/documents/:documentId/sheets/:sheetId')
  @ApiOperation({ summary: 'Delete sheet (guest access with path token)' })
  @ApiParam({ name: 'token', description: 'Shared link token' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiParam({ name: 'sheetId', description: 'Sheet ID' })
  @ApiResponse({ status: 200, description: 'Sheet deleted successfully' })
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
