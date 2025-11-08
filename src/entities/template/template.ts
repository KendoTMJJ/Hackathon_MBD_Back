import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('template', { schema: 'public' })
export class Template {
  @ApiProperty({ description: 'Template unique identifier', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'template_id' })
  id: string;

  @ApiProperty({ description: 'Template title', example: 'CRM Diagram' })
  @Column({ name: 'title', type: 'varchar' })
  title: string;

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
    description: 'Indicates whether the template is archived',
    example: false,
  })
  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @ApiProperty({
    description: 'Creator user ID (Auth0 sub)',
    example: 'auth0|123',
  })
  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @ApiProperty({ description: 'Template creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Template last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ApiProperty({ description: 'Template kind', example: 'diagram' })
  @Column({ name: 'kind', type: 'varchar', default: 'diagram' })
  kind: string;
}
