// diagrams/shared-link/shared-links.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Document } from 'src/entities/document/document';
import { ShareLink } from 'src/entities/shared-link/shared-link';
import { Collaborator } from 'src/entities/collaborator/collaborator';

import { ShareLinksService } from './shared-links.service';
import { ShareLinksController } from './shared-links.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ShareLink, Document, Collaborator])],
  controllers: [ShareLinksController],
  providers: [ShareLinksService],
  exports: [ShareLinksService],
})
export class SharedLinksModule {}
