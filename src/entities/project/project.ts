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

@Entity('project', { schema: 'public' })
export class Project {
  @ApiProperty({ description: 'Project unique identifier', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'project_id' })
  id: string;

  @ApiProperty({ description: 'Project name', example: 'Sales Team' })
  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @ApiProperty({
    description: 'Project owner (Auth0 sub)',
    example: 'auth0|123',
  })
  @Column({ name: 'owner_sub', type: 'varchar' })
  ownerSub: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Documents associated with this project',
    type: () => [Document],
  })
  @OneToMany(() => Document, (d: Document) => d.project)
  documents: Document[];
}
