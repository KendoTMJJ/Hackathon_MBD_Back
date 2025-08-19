import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Document } from '../document/document';

@Entity('SharedLink', { schema: 'public' })
export class SharedLink {
  @ApiProperty({ description: 'ID del link compartido', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'cod_shared_link' })
  id: string;

  @ApiProperty({ description: 'Token único para acceso', example: 'abc123xyz' })
  @Index({ unique: true })
  @Column({ name: 'token', type: 'varchar', length: 64 })
  token: string;

  @ApiProperty({ description: 'Permiso', example: 'read' })
  @Column({ name: 'permission', type: 'varchar' })
  permission: 'read' | 'edit';

  @ApiProperty({ description: 'Fecha de expiración', required: false })
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @ApiProperty({ description: 'Contraseña hash', required: false })
  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  passwordHash: string | null;

  @ApiProperty({ description: 'Activo', example: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Creador (Auth0 sub)', example: 'auth0|123' })
  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Documento', type: () => Document })
  @Index()
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => Document, (d: Document) => d.sharedLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: Document;
}