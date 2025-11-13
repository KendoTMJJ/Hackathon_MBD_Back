import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollabGateway } from './collab.gateway';
import { CollabService } from './collab.service'; // ⬅️ importa el servicio
import { Document } from 'src/entities/document/document';
import { Collaborator } from 'src/entities/collaborator/collaborator';
import { ShareLink } from 'src/entities/shared-link/shared-link';
import { SharedLinksModule } from '../shared-link/shared-links.module';
import { SheetsModule } from '../sheets/sheets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Collaborator, ShareLink]),
    SharedLinksModule, forwardRef(() => SheetsModule), // para WsJwtGuard/SharedLinksService
  ],
  providers: [
    CollabGateway,
    CollabService, // ⬅️ añade el service como provider
  ],
  exports: [
    CollabGateway,
    CollabService, // ⬅️ opcional, por si lo usas en otros módulos
  ],
})
export class CollabModule {}
