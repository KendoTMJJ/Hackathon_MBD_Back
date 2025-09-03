import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'src/entities/document/document';
import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  Index,
} from 'typeorm';

export type CollaboratorRole = 'owner' | 'editor' | 'reader';

@Entity({ name: 'collaborator', schema: 'public' }) // <-- minúsculas (opcional)
@Unique('uq_collaborator_doc_user', ['documentId', 'userSub'])
@Index('idx_collaborator_document', ['documentId'])
@Index('idx_collaborator_user', ['userSub'])
export class Collaborator {
  @ApiProperty({ description: 'ID del colaborador', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'cod_collaborator' })
  id: string;

  @ApiProperty({ description: 'Documento', example: 'uuid' })
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => Document, (d) => d.collaborators, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ApiProperty({ description: 'Usuario (Auth0 sub)', example: 'auth0|123' })
  @Column({ name: 'user_sub', type: 'varchar', length: 128 })
  userSub: string;

  @ApiProperty({ description: 'Rol', example: 'editor' })
  @Column({
    name: 'role_collab',
    type: 'enum',
    enum: ['owner', 'editor', 'reader'],
    default: 'reader',
  })
  role: CollaboratorRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
