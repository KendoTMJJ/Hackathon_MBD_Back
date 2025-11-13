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
import { Sheet } from '../sheet/sheet';
import { ShareLink } from '../shared-link/shared-link';

@Entity('document', { schema: 'public' })
export class Document {
  @ApiProperty({ description: 'Document unique identifier', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'document_id' })
  id: string;

  @ApiProperty({ description: 'Document title', example: 'CRM Diagram' })
  @Column({ name: 'title', type: 'varchar' })
  title: string;

  @ApiProperty({ description: 'Document type', example: 'diagram' })
  @Column({ name: 'kind', type: 'varchar', default: 'diagram' })
  kind: 'diagram' | 'template';

  @ApiProperty({
    description: 'React Flow JSON data',
    example: { nodes: [], edges: [] },
  })
  @Column({ name: 'data', type: 'jsonb', default: () => `'{}'` })
  data: Record<string, any>;

  @ApiProperty({ description: 'Optimistic lock version', example: 1 })
  @VersionColumn({ name: 'version', type: 'int' })
  version: number;

  @ApiProperty({
    description: 'Origin template ID (optional)',
    example: 'uuid',
    required: false,
  })
  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId?: string | null;

  @ApiProperty({
    description: 'Indicates whether the document is archived',
    example: false,
  })
  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @ApiProperty({
    description: 'Creator user (Auth0 sub)',
    example: 'auth0|123',
  })
  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ApiProperty({ description: 'Associated project ID' })
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

  @OneToMany(() => ShareLink, (sl: ShareLink) => sl.document)
  sharedLinks: ShareLink[];

  @OneToMany(() => Sheet, (s: Sheet) => s.document)
  sheets: Sheet[];
}
