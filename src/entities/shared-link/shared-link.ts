// src/entities/shared-link/shared-link.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from 'src/entities/project/project';
import { Document } from 'src/entities/document/document';

export type ShareScope = 'project' | 'document';
export type ShareMinRole = 'editor' | 'reader';

@Entity({ name: 'share_link', schema: 'public' })
export class ShareLink {
  @PrimaryGeneratedColumn('uuid', { name: 'cod_share_link' })
  id: string;

  @Column({ name: 'slug', type: 'varchar', length: 26, unique: true })
  @Index('idx_share_slug', { unique: true })
  slug: string;

  @Column({
    type: 'enum',
    enum: ['document', 'project'],
    default: 'document',
  })
  scope!: ShareScope;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string | null;
  @ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: Project | null;

  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId?: string | null;
  @ManyToOne(() => Document, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'document_id' })
  document?: Document | null;

  @Column({
    name: 'min_role',
    type: 'enum',
    enum: ['editor', 'reader'],
    default: 'reader',
  })
  minRole: ShareMinRole;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses?: number | null;

  @Column({ name: 'uses', type: 'int', default: 0 })
  uses: number;

  @Column({ name: 'created_by_sub', type: 'varchar', length: 128 })
  createdBySub: string;

  /** 👇 faltaba esta columna */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  get isExpired() {
    return this.expiresAt && new Date() > this.expiresAt;
  }
}
