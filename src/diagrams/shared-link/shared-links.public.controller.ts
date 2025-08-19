import { Controller, Get, Param, Query } from '@nestjs/common';
import { SharedLinksService } from './shared-links.service';

@Controller('shared')
export class PublicSharedLinksController {
  constructor(private readonly sharedLinksService: SharedLinksService) {}

  @Get(':token')
  async getByToken(
    @Param('token') token: string,
    @Query('password') password?: string,
  ) {
    return this.sharedLinksService.getByToken(token, password);
  }
}
