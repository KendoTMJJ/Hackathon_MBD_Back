import { ApiProperty } from '@nestjs/swagger';
import { Document } from '../document/document';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('Project', { schema: 'public' })
export class Project {
  @ApiProperty({ description: 'ID del proyecto', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'cod_project' })
  id: string;

  @ApiProperty({ description: 'Nombre', example: 'Equipo Ventas' })
  @Column({ name: 'name_project', type: 'varchar' })
  name: string;

  @ApiProperty({ description: 'Owner (Auth0 sub)', example: 'auth0|123' })
  @Column({ name: 'owner_sub', type: 'varchar' })
  ownerSub: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Document, (d: Document) => d.project)
  documents: Document[];
}
