import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Document as DocumentEntity } from '../document/document';

@Entity('Collaborator', { schema: 'public' })
@Unique(['documentId', 'userSub'])
export class Collaborator {
  @ApiProperty({ description: 'ID del colaborador', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'cod_collaborator' })
  id: string;

  @ApiProperty({ description: 'Documento', example: 'uuid' })
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => DocumentEntity, (d: DocumentEntity) => d.collaborators, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: DocumentEntity;
  @ApiProperty({ description: 'Usuario (Auth0 sub)', example: 'auth0|123' })
  @Column({ name: 'user_sub', type: 'varchar' })
  userSub: string;

  @ApiProperty({ description: 'Rol', example: 'editor' })
  @Column({ name: 'role_collab', type: 'varchar' })
  role: 'owner' | 'editor' | 'reader';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
