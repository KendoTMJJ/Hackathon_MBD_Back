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
  @ApiProperty({
    description: 'Collaborator unique identifier',
    example: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid', { name: 'collaborator_id' })
  id: string;

  @ApiProperty({ description: 'Associated document ID', example: 'uuid' })
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => Document, (d) => d.collaborators, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ApiProperty({ description: 'User Auth0 sub', example: 'auth0|123' })
  @Column({ name: 'user_sub', type: 'varchar', length: 128 })
  userSub: string;

  @ApiProperty({ description: 'Collaborator role', example: 'editor' })
  @Column({
    name: 'role',
    type: 'enum',
    enum: ['owner', 'editor', 'reader'],
    default: 'reader',
  })
  role: CollaboratorRole;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
