import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'src/entities/document/document';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('sheet', { schema: 'public' })
export class Sheet {
  @ApiProperty({ description: 'Sheet unique identifier', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'sheet_id' })
  id: string;

  @ApiProperty({ description: 'Sheet name', example: 'Sheet 1' })
  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @ApiProperty({ description: 'Display order index', example: 0 })
  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @ApiProperty({
    description: 'Sheet React Flow data',
    example: { nodes: [], edges: [] },
  })
  @Column({ name: 'data', type: 'jsonb', default: () => `'{}'` })
  data: Record<string, any>;

  @VersionColumn({ name: 'version', default: 0 })
  version: number;

  @ApiProperty({ description: 'Whether the sheet is active', example: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ApiProperty({ description: 'Associated document ID' })
  @Index()
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => Document, (doc: Document) => doc.sheets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: Document;
}
