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
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SheetsService } from './sheets.service';
import { CreateSheetDto } from './dto/create-sheet.dto';
import { UpdateSheetDto } from './dto/update-sheet.dto';
import { ShareLinksService } from '../shared-link/shared-links.service';

/* =================== PROTECTED CONTROLLERS (JWT) =================== */

/**
 * Controller for sheet operations within documents
 * Provides endpoints for creating and listing sheets within specific documents
 */
@ApiTags('sheets')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('documents')
export class SheetsController {
  constructor(private readonly sheetsService: SheetsService) {}

  /**
   * Creates a new sheet in a document
   * @param documentId - The document ID where the sheet will be created
   * @param dto - Data for creating the sheet
   * @param req - Request object containing user information
   * @returns The created sheet
   */
  @Post(':id/sheets')
  @ApiOperation({ summary: 'Create new sheet in document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 201, description: 'Sheet created successfully' })
  @ApiResponse({ status: 403, description: 'No edit permission for document' })
  createSheet(
    @Param('id') documentId: string,
    @Body() dto: CreateSheetDto,
    @Req() req: any,
  ) {
    return this.sheetsService.create(documentId, dto, req.user.sub);
  }

  /**
   * Lists all sheets in a document
   * @param documentId - The document ID to list sheets from
   * @param req - Request object containing user information
   * @returns Array of sheets in the document
   */
  @Get(':id/sheets')
  @ApiOperation({ summary: 'List sheets of a document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Sheets retrieved successfully' })
  @ApiResponse({ status: 403, description: 'No read permission for document' })
  listSheets(@Param('id') documentId: string, @Req() req: any) {
    return this.sheetsService.listByDocument(documentId, req.user.sub);
  }
}

/**
 * Controller for sheet management operations
 * Provides endpoints for retrieving, updating, and deleting individual sheets
 */
@ApiTags('sheets')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('documents/sheets')
export class SheetsManagementController {
  constructor(private readonly sheetsService: SheetsService) {}

  /**
   * Retrieves a specific sheet by ID
   * @param sheetId - The sheet ID to retrieve
   * @param req - Request object containing user information
   * @returns The requested sheet
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get sheet by ID' })
  @ApiParam({ name: 'id', description: 'Sheet ID' })
  @ApiResponse({ status: 200, description: 'Sheet retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Sheet not found' })
  getSheet(@Param('id') sheetId: string, @Req() req: any) {
    return this.sheetsService.get(sheetId, req.user.sub);
  }

  /**
   * Updates a sheet with new data
   * @param sheetId - The sheet ID to update
   * @param dto - Data for updating the sheet
   * @param req - Request object containing user information
   * @returns The updated sheet
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update sheet' })
  @ApiParam({ name: 'id', description: 'Sheet ID' })
  @ApiResponse({ status: 200, description: 'Sheet updated successfully' })
  @ApiResponse({ status: 403, description: 'No edit permission for document' })
  updateSheet(
    @Param('id') sheetId: string,
    @Body() dto: UpdateSheetDto,
    @Req() req: any,
  ) {
    return this.sheetsService.update(sheetId, dto, req.user.sub);
  }

  /**
   * Deletes a sheet
   * @param sheetId - The sheet ID to delete
   * @param req - Request object containing user information
   * @returns Confirmation of deletion
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete sheet' })
  @ApiParam({ name: 'id', description: 'Sheet ID' })
  @ApiResponse({ status: 200, description: 'Sheet deleted successfully' })
  @ApiResponse({ status: 403, description: 'No edit permission for document' })
  @ApiResponse({ status: 400, description: 'Cannot delete the last sheet' })
  deleteSheet(@Param('id') sheetId: string, @Req() req: any) {
    return this.sheetsService.delete(sheetId, req.user.sub);
  }
}

/**
 * Controller for sheet reordering operations
 * Provides endpoints for reordering sheets within documents and updating specific sheets
 */
@ApiTags('sheets')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('documents/:documentId/sheets/reorder')
export class SheetsReorderController {
  constructor(private readonly sheetsService: SheetsService) {}

  /**
   * Reorders sheets in a document
   * @param documentId - The document ID containing the sheets
   * @param sheetIds - Array of sheet IDs in desired order
   * @param req - Request object containing user information
   * @returns Confirmation of reordering
   */
  @Post()
  @ApiOperation({ summary: 'Reorder sheets in a document' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Sheets reordered successfully' })
  @ApiResponse({ status: 403, description: 'No edit permission for document' })
  reorderSheets(
    @Param('documentId') documentId: string,
    @Body('sheetIds') sheetIds: string[],
    @Req() req: any,
  ) {
    return this.sheetsService.reorder(documentId, sheetIds, req.user.sub);
  }

  /**
   * Updates a specific sheet in a document
   * @param documentId - The document ID containing the sheet
   * @param sheetId - The sheet ID to update
   * @param dto - Data for updating the sheet
   * @param req - Request object containing user information
   * @returns The updated sheet
   */
  @Put(':documentId/sheets/:sheetId')
  @ApiOperation({ summary: 'Update specific sheet' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiParam({ name: 'sheetId', description: 'Sheet ID' })
  @ApiResponse({ status: 200, description: 'Sheet updated successfully' })
  @ApiResponse({ status: 403, description: 'No edit permission for document' })
  updateSheetInDocument(
    @Param('documentId') documentId: string,
    @Param('sheetId') sheetId: string,
    @Body() dto: UpdateSheetDto,
    @Req() req: any,
  ) {
    return this.sheetsService.update(sheetId, dto, req.user.sub);
  }
}

/* =================== SHARED LINK CONTROLLER (NO JWT) =================== */
/**
 * Controller for shared sheet operations without JWT authentication
 * Provides endpoints for sheet management via shared links using token-based access
 */
@ApiTags('shared-sheets')
@Controller('shared-links/:token/documents/:documentId/sheets')
export class SharedSheetsController {
  constructor(
    private readonly sheetsService: SheetsService,
    private readonly sharedLinksService: ShareLinksService,
  ) {}

  /**
   * Validates the shared link token and checks access conditions
   * @param token - The shared link token to validate
   * @returns The validated shared link object
   * @throws {BadRequestException} When token is invalid or access conditions are not met
   */
  private async getLink(token: string) {
    const link = await this.sharedLinksService.getByToken(token);
    if (!link) throw new BadRequestException('Invalid shared link token');

    // Verify if the link is active and not expired
    if (!link.isActive) {
      throw new BadRequestException('Shared link is inactive');
    }

    if (link.isExpired) {
      throw new BadRequestException('Shared link has expired');
    }

    // Verify usage limit if configured
    if (link.maxUses && link.uses >= link.maxUses) {
      throw new BadRequestException('Shared link usage limit exceeded');
    }

    return link;
  }

  /**
   * Lists sheets in a document via shared link access
   * @param token - Shared link token for access validation
   * @param documentId - The document ID to list sheets from
   * @returns Array of sheets in the document
   */
  @Get()
  @ApiOperation({ summary: 'List sheets (shared link access)' })
  @ApiParam({ name: 'token', description: 'Shared link token' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Sheets retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async listByDocumentShared(
    @Param('token') token: string,
    @Param('documentId') documentId: string,
  ) {
    const link = await this.getLink(token);
    return this.sheetsService.listByDocumentViaSharedLink(documentId, link);
  }

  /**
   * Creates a sheet via shared link access
   * @param token - Shared link token for access validation
   * @param documentId - The document ID where the sheet will be created
   * @param dto - Data for creating the sheet
   * @returns The created sheet
   */
  @Post()
  @ApiOperation({ summary: 'Create sheet (shared link access)' })
  @ApiParam({ name: 'token', description: 'Shared link token' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 201, description: 'Sheet created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or insufficient permissions',
  })
  async createShared(
    @Param('token') token: string,
    @Param('documentId') documentId: string,
    @Body() dto: CreateSheetDto,
  ) {
    const link = await this.getLink(token);

    // Verify edit permissions using the correct property
    if (link.minRole !== 'editor') {
      throw new BadRequestException('No edit permission for shared link');
    }

    return this.sheetsService.createViaSharedLink(documentId, dto, link);
  }

  /**
   * Updates a sheet via shared link access
   * @param token - Shared link token for access validation
   * @param documentId - The document ID containing the sheet
   * @param sheetId - The sheet ID to update
   * @param dto - Data for updating the sheet
   * @returns The updated sheet
   */
  @Patch(':sheetId')
  @ApiOperation({ summary: 'Update sheet (shared link access)' })
  @ApiParam({ name: 'token', description: 'Shared link token' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiParam({ name: 'sheetId', description: 'Sheet ID' })
  @ApiResponse({ status: 200, description: 'Sheet updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or insufficient permissions',
  })
  async updateShared(
    @Param('token') token: string,
    @Param('documentId') documentId: string,
    @Param('sheetId') sheetId: string,
    @Body() dto: UpdateSheetDto,
  ) {
    const link = await this.getLink(token);

    // Verify edit permissions
    if (link.minRole !== 'editor') {
      throw new BadRequestException('No edit permission for shared link');
    }

    return this.sheetsService.updateViaSharedLink(sheetId, dto, documentId);
  }

  /**
   * Deletes a sheet via shared link access
   * @param token - Shared link token for access validation
   * @param documentId - The document ID containing the sheet
   * @param sheetId - The sheet ID to delete
   * @returns Confirmation of deletion
   */
  @Delete(':sheetId')
  @ApiOperation({ summary: 'Delete sheet (shared link access)' })
  @ApiParam({ name: 'token', description: 'Shared link token' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiParam({ name: 'sheetId', description: 'Sheet ID' })
  @ApiResponse({ status: 200, description: 'Sheet deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or insufficient permissions',
  })
  async deleteShared(
    @Param('token') token: string,
    @Param('documentId') documentId: string,
    @Param('sheetId') sheetId: string,
  ) {
    const link = await this.getLink(token);

    // Verify edit permissions
    if (link.minRole !== 'editor') {
      throw new BadRequestException('No edit permission for shared link');
    }

    return this.sheetsService.deleteViaSharedLink(sheetId, link);
  }
}
