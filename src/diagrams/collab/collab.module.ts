import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollabGateway } from './collab.gateway';
import { CollabService } from './collab.service';
import { Document } from 'src/entities/document/document';
import { Collaborator } from 'src/entities/collaborator/collaborator';
import { ShareLink } from 'src/entities/shared-link/shared-link';
import { SharedLinksModule } from '../shared-link/shared-links.module';
import { SheetsModule } from '../sheets/sheets.module';

@Module({
  imports: [
    // Registers the Document, Collaborator, and ShareLink entities
    // so they can be injected into the service using TypeORM
    TypeOrmModule.forFeature([Document, Collaborator, ShareLink]),

    // Provides access to SharedLinksService (used inside the gateway)
    SharedLinksModule,

    // Required to avoid circular dependency with SheetsModule
    forwardRef(() => SheetsModule),
  ],

  providers: [
    // WebSocket gateway responsible for handling real-time collaboration events
    CollabGateway,

    // Business logic for collaborative editing operations
    CollabService,
  ],

  // Exports allow other modules to use the gateway/service if needed
  exports: [CollabGateway, CollabService],
})
export class CollabModule {}
