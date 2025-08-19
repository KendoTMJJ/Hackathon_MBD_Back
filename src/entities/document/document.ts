import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Project } from '../project/project';
import { Collaborator } from '../collaborator/collaborator';
import { Snapshot } from '../snapshot/snapshot';
import { SharedLink } from '../shared-link/shared-link';
import { Sheet } from 'src/entities/sheet/sheet';

@Entity('Document', { schema: 'public' })
export class Document {
  @ApiProperty({ description: 'ID del documento', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'cod_document' })
  id: string;

  @ApiProperty({ description: 'Título', example: 'Diagrama CRM' })
  @Column({ name: 'title_document', type: 'varchar' })
  title: string;

  @ApiProperty({ description: 'Tipo', example: 'diagram' })
  @Column({ name: 'kind_document', type: 'varchar', default: 'diagram' })
  kind: 'diagram' | 'template';

  @ApiProperty({
    description: 'JSON React Flow',
    example: { nodes: [], edges: [] },
  })
  @Column({ name: 'data_document', type: 'jsonb', default: () => `'{}'` })
  data: Record<string, any>;

  @ApiProperty({ description: 'Versión (lock optimista)', example: 1 })
  @VersionColumn({ name: 'version', type: 'int' })
  version: number;

  @ApiProperty({
    description: 'Plantilla origen',
    example: 'uuid',
    required: false,
  })
  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

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

  @ApiProperty({ description: 'Proyecto', type: () => Project })
  @Index()
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, (p: Project) => p.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(() => Collaborator, (c: Collaborator) => c.document)
  collaborators: Collaborator[];

  @OneToMany(() => Snapshot, (s: Snapshot) => s.document)
  snapshots: Snapshot[];

  @OneToMany(() => SharedLink, (sl: SharedLink) => sl.document)
  sharedLinks: SharedLink[];

  @OneToMany(() => Sheet, (s: Sheet) => s.document)
  sheets: Sheet[];
}
