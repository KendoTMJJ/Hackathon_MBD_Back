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
} from 'typeorm';

@Entity('Sheet', { schema: 'public' })
export class Sheet {
  @ApiProperty({ description: 'ID de la hoja', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'cod_sheet' })
  id: string;

  @ApiProperty({ description: 'Nombre de la hoja', example: 'Hoja 1' })
  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @ApiProperty({ description: 'Orden de la hoja', example: 0 })
  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @ApiProperty({
    description: 'Datos de la hoja (React Flow)',
    example: { nodes: [], edges: [] },
  })
  @Column({ name: 'data', type: 'jsonb', default: () => `'{}'` })
  data: Record<string, any>;

  @ApiProperty({ description: 'Activa', example: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ApiProperty({ description: 'Documento', type: () => Document })
  @Index()
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => Document, (d: Document) => d.sheets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: Document;
}