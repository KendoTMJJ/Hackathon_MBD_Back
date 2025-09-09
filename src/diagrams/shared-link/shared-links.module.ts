// diagrams/shared-link/shared-links.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Document } from 'src/entities/document/document';
import { ShareLink } from 'src/entities/shared-link/shared-link';
import { Collaborator } from 'src/entities/collaborator/collaborator'; // ⬅️ import

import { SheetsModule } from '../sheets/sheets.module';
import { WsJwtGuard } from './ws-jwt.guard'; // si lo expones desde aquí
import { ShareLinksService } from './shared-links.service';
import { ShareLinksController } from './shared-links.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShareLink, Document, Collaborator]), // ⬅️ añade Collaborator
    SheetsModule,
  ],
  controllers: [ShareLinksController],
  providers: [ShareLinksService, WsJwtGuard],
  exports: [ShareLinksService, WsJwtGuard],
})
export class SharedLinksModule {}
