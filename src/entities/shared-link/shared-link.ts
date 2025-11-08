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
import { Project } from '../project/project';
import { Document } from '../document/document';
import { ApiProperty } from '@nestjs/swagger';

export type ShareScope = 'project' | 'document';
export type ShareMinRole = 'editor' | 'reader';

@Entity({ name: 'share_link', schema: 'public' })
export class ShareLink {
  @ApiProperty({ description: 'Share link unique identifier', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'share_link_id' })
  id: string;

  @ApiProperty({
    description: 'Unique short slug for the share link',
    example: 'aBcD123xYzPqRs',
  })
  @Index('idx_share_slug', { unique: true })
  @Column({ name: 'slug', type: 'varchar', length: 26, unique: true })
  slug: string;

  @ApiProperty({
    description: 'Share scope: project or document',
    example: 'document',
  })
  @Column({
    name: 'scope',
    type: 'enum',
    enum: ['document', 'project'],
    default: 'document',
  })
  scope: ShareScope;

  @ApiProperty({
    description: 'Associated project ID (optional)',
    example: 'uuid',
    required: false,
  })
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string | null;

  @ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: Project | null;

  @ApiProperty({
    description: 'Associated document ID (optional)',
    example: 'uuid',
    required: false,
  })
  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId?: string | null;

  @ManyToOne(() => Document, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'document_id' })
  document?: Document | null;

  @ApiProperty({
    description: 'Minimum access role for this link',
    example: 'reader',
  })
  @Column({
    name: 'min_role',
    type: 'enum',
    enum: ['editor', 'reader'],
    default: 'reader',
  })
  minRole: ShareMinRole;

  @ApiProperty({
    description: 'Expiration date (optional)',
    example: '2025-12-31T23:59:59Z',
  })
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @ApiProperty({ description: 'Maximum allowed uses (optional)', example: 10 })
  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses?: number | null;

  @ApiProperty({
    description: 'Number of times this link has been used',
    example: 3,
  })
  @Column({ name: 'uses', type: 'int', default: 0 })
  uses: number;

  @ApiProperty({
    description: 'Creator user (Auth0 sub)',
    example: 'auth0|123',
  })
  @Column({ name: 'created_by_sub', type: 'varchar', length: 128 })
  createdBySub: string;

  @ApiProperty({
    description: 'Indicates whether the link is active',
    example: true,
  })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  /** Computed field — not persisted */
  get isExpired(): boolean {
    return !!this.expiresAt && new Date() > this.expiresAt;
  }
}
