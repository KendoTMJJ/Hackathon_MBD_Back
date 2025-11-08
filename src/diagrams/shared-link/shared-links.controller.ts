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
import {
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

/**
 * Controller for managing share link operations
 *
 * @remarks
 * Provides endpoints for creating, listing, previewing, accepting, and revoking share links.
 * Most operations require JWT authentication except for public preview.
 */
@ApiTags('share-links')
@Controller('share-links')
export class ShareLinksController {
  constructor(private readonly shareLinksService: ShareLinksService) {}

  /**
   * Creates a new share link
   *
   * @param createShareLinkDto - DTO containing share link configuration
   * @param request - Express request object containing user information
   * @returns Created share link with URL
   */
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear un nuevo enlace compartido',
    description: 'Crea un nuevo enlace compartido para un documento o proyecto',
  })
  @ApiResponse({ status: 201, description: 'Share link created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  @ApiResponse({ status: 403, description: 'User lacks sharing permissions' })
  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createShareLinkDto: CreateShareLinkDto, @Req() request: any) {
    return this.shareLinksService.create(createShareLinkDto, request.user.sub);
  }

  /**
   * Lists all active share links for a specific document
   *
   * @param documentId - Document ID to filter share links
   * @param request - Express request object containing user information
   * @returns List of share links for the specified document
   */
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar enlaces compartidos de un documento',
    description:
      'Obtiene todos los enlaces activos para un documento específico',
  })
  @ApiResponse({
    status: 200,
    description: 'List of share links retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User lacks permission to view share links',
  })
  @UseGuards(AuthGuard('jwt'))
  @Get()
  listByDocument(@Query('documentId') documentId: string, @Req() request: any) {
    return this.shareLinksService.listByDocument(documentId, request.user.sub);
  }

  /**
   * Previews a share link without consuming it
   *
   * @param slug - Unique slug identifier of the share link
   * @returns Share link details if valid
   */
  @ApiOperation({
    summary: 'Previsualizar enlace compartido',
    description: 'Obtiene los detalles de un enlace compartido sin consumirlo',
  })
  @ApiResponse({
    status: 200,
    description: 'Share link details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  @ApiResponse({
    status: 403,
    description: 'Share link expired or has no remaining uses',
  })
  @Get(':slug')
  preview(@Param('slug') slug: string) {
    return this.shareLinksService.preview(slug);
  }

  /**
   * Accepts a share link and grants appropriate permissions
   *
   * @param slug - Unique slug identifier of the share link
   * @param request - Express request object containing user information
   * @returns Confirmation of successful acceptance
   */
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Aceptar enlace compartido',
    description:
      'Acepta un enlace compartido y otorga los permisos correspondientes al usuario',
  })
  @ApiResponse({ status: 200, description: 'Share link accepted successfully' })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  @ApiResponse({
    status: 403,
    description: 'Share link expired or has no remaining uses',
  })
  @UseGuards(AuthGuard('jwt'))
  @Post(':slug/accept')
  accept(@Param('slug') slug: string, @Req() request: any) {
    return this.shareLinksService.accept(slug, request.user.sub);
  }

  /**
   * Revokes (deactivates) a share link
   *
   * @param shareLinkId - ID of the share link to revoke
   * @param request - Express request object containing user information
   * @returns Confirmation of successful revocation
   */
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revocar enlace compartido',
    description: 'Desactiva un enlace compartido existente',
  })
  @ApiResponse({ status: 200, description: 'Share link revoked successfully' })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  @ApiResponse({
    status: 403,
    description: 'User lacks permission to revoke share link',
  })
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  revoke(@Param('id') shareLinkId: string, @Req() request: any) {
    return this.shareLinksService.revoke(shareLinkId, request.user.sub);
  }
}
