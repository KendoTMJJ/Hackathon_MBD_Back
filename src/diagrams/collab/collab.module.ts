// diagrams/collab/collab.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollabGateway } from './collab.gateway';
import { Document } from 'src/entities/document/document';
import { Collaborator } from 'src/entities/collaborator/collaborator';
import { SharedLink } from 'src/entities/shared-link/shared-link';
import { SharedLinksModule } from '../shared-link/shared-links.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Collaborator, SharedLink]),
    SharedLinksModule,
  ],
  providers: [CollabGateway],
  exports: [CollabGateway],
})
export class CollabModule {}
