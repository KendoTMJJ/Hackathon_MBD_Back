import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SheetsService } from './sheets.service';
import { 
  SheetsController, 
  SheetsManagementController, 
  SheetsReorderController 
} from './sheets.controller';
import { Sheet } from '../../entities/sheet/sheet';
import { Document } from '../../entities/document/document';
import { Collaborator } from '../../entities/collaborator/collaborator';

@Module({
  imports: [TypeOrmModule.forFeature([Sheet, Document, Collaborator])],
  controllers: [
    SheetsController, 
    SheetsManagementController, 
    SheetsReorderController
  ],
  providers: [SheetsService],
  exports: [SheetsService],
})
export class SheetsModule {}