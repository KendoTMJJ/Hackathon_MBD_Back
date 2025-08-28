import { Module } from '@nestjs/common';
import { ProjectsModule } from './projects/projects.module';
import { DocumentsModule } from './documents/documents.module';
import { ProjectsService } from './projects/projects.service';
import { ProjectsController } from './projects/projects.controller';
import { DocumentsService } from './documents/documents.service';
import { DocumentsController } from './documents/documents.controller';
import { CollabModule } from './collab/collab.module';
import { TemplatesModule } from './templates/templates.module';
import { SharedLinksModule } from './shared-link/shared-links.module';
import { SheetsService } from './sheets/sheets.service';
import { SheetsController } from './sheets/sheets.controller';
import { SheetsModule } from './sheets/sheets.module';
import { TecnologiesModule } from './tecnologies/tecnologies.module';

@Module({
  imports: [
    ProjectsModule,
    DocumentsModule,
    CollabModule,
    TemplatesModule,
    SharedLinksModule,
    SheetsModule,
    TecnologiesModule,
  ],
  providers: [
    ProjectsService,
    DocumentsService,
    SheetsService,
  ],
  controllers: [
    ProjectsController,
    DocumentsController,
    SheetsController,
  ],
})
export class DiagramsModule {}
