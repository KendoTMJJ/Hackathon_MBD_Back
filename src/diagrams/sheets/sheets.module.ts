import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SheetsService } from './sheets.service';
import { 
  SharedSheetsController,
  SheetsController, 
  SheetsManagementController, 
  SheetsReorderController 
} from './sheets.controller';
import { Sheet } from '../../entities/sheet/sheet';
import { Document } from '../../entities/document/document';
import { Collaborator } from '../../entities/collaborator/collaborator';
import { SharedLinksModule } from '../shared-link/shared-links.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sheet, Document, Collaborator]), SharedLinksModule],
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