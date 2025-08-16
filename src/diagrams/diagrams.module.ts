import { Module } from '@nestjs/common';
import { ProjectsModule } from './projects/projects.module';
import { DocumentsModule } from './documents/documents.module';
import { ProjectsService } from './projects/projects.service';
import { ProjectsController } from './projects/projects.controller';
import { DocumentsService } from './documents/documents.service';
import { DocumentsController } from './documents/documents.controller';
import { CollabModule } from './collab/collab.module';

@Module({
  imports: [ProjectsModule, DocumentsModule, CollabModule],
  providers: [ProjectsService, DocumentsService],
  controllers: [ProjectsController, DocumentsController],
})
export class DiagramsModule {}
