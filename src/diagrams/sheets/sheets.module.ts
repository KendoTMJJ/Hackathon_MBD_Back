import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SheetsService } from './sheets.service';
import {
  SharedSheetsController,
  SheetsController,
  SheetsManagementController,
  SheetsReorderController,
} from './sheets.controller';

import { SharedLinksModule } from '../shared-link/shared-links.module';
import { Collaborator } from 'src/entities/collaborator/collaborator';
import { Sheet } from 'src/entities/sheet/sheet';
import { Document } from 'src/entities/document/document';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sheet, Document, Collaborator]),
    SharedLinksModule,
  ],
  controllers: [
    SheetsController,
    SheetsManagementController,
    SheetsReorderController,
    SharedSheetsController,
  ],
  providers: [SheetsService],
  exports: [SheetsService],
})
export class SheetsModule {}
