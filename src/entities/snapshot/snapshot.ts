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
import { Document } from '../document/document';

@Entity('snapshot', { schema: 'public' })
@Unique(['documentId', 'version'])
export class Snapshot {
  @ApiProperty({ description: 'Snapshot unique identifier', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'snapshot_id' })
  id: string;

  @ApiProperty({ description: 'Associated document ID', example: 'uuid' })
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => Document, (doc: Document) => doc.snapshots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ApiProperty({ description: 'Document version', example: 7 })
  @Column({ name: 'version', type: 'int' })
  version: number;

  @ApiProperty({
    description: 'Snapshot JSON data',
    example: { nodes: [], edges: [] },
  })
  @Column({ name: 'data', type: 'jsonb', default: () => `'{}'` })
  data: Record<string, any>;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
