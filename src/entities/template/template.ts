import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

@Entity('Template', { schema: 'public' })
export class Template {
  @ApiProperty({ description: 'ID del documento', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'cod_document' })
  id: string;

  @ApiProperty({ description: 'Título', example: 'Diagrama CRM' })
  @Column({ name: 'title_document', type: 'varchar' })
  title: string;

  @ApiProperty({
    description: 'JSON React Flow',
    example: { nodes: [], edges: [] },
  })
  @Column({ name: 'data_document', type: 'jsonb', default: () => `'{}'` })
  data: Record<string, any>;

  @ApiProperty({ description: 'Versión (lock optimista)', example: 1 })
  @VersionColumn({ name: 'version', type: 'int' })
  version: number;

  @ApiProperty({ description: 'Archivado', example: false })
  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @ApiProperty({ description: 'Creador (Auth0 sub)', example: 'auth0|123' })
  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ApiProperty({ description: 'Tipo', example: 'diagram' })
  @Column({ name: 'kind_document', type: 'varchar', default: 'diagram' })
  kind: string;
}
