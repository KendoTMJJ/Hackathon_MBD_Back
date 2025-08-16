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

@Entity('Snapshot', { schema: 'public' })
@Unique(['documentId', 'version'])
export class Snapshot {
  @ApiProperty({ description: 'ID del snapshot', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'cod_snapshot' })
  id: string;

  @ApiProperty({ description: 'Documento', example: 'uuid' })
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => DocumentEntity, (d: DocumentEntity) => d.snapshots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: DocumentEntity;

  @ApiProperty({ description: 'Versión del documento', example: 7 })
  @Column({ name: 'version', type: 'int' })
  version: number;

  @ApiProperty({
    description: 'Estado completo JSON',
    example: { nodes: [], edges: [] },
  })
  @Column({ name: 'data_snapshot', type: 'jsonb', default: () => `'{}'` })
  data: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
