import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedLinksService } from './shared-links.service';
import { SharedLinksController } from './shared-links.controller';
import { SharedLink } from '../../entities/shared-link/shared-link';
import { Document } from '../../entities/document/document';
import { PublicSharedLinksController } from './shared-links.public.controller';
import { SharedSheetsController } from './shared-sheets.controller';
import { SheetsModule } from '../sheets/sheets.module';

@Module({
  imports: [TypeOrmModule.forFeature([SharedLink, Document]), SheetsModule],
  controllers: [SharedLinksController, PublicSharedLinksController, SharedSheetsController],
  providers: [SharedLinksService],
  exports: [SharedLinksService],
})
export class SharedLinksModule {}
