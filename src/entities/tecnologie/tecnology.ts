import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export const ZONE_TYPES = ['cloud', 'dmz', 'lan', 'datacenter', 'ot'] as const;
export type ZoneType = (typeof ZONE_TYPES)[number];

@Entity('technology', { schema: 'public' })
@Unique(['name'])
export class Technology {
  @ApiProperty({ description: 'Technology unique identifier', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'technology_id' })
  id: string;

  @ApiProperty({ description: 'Technology name', example: 'NGINX' })
  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  @ApiProperty({
    description: 'Local image path',
    example: '/assets/images/nginx.png',
  })
  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl?: string;

  @ApiProperty({
    description: 'Technology description',
    example: 'High-performance web server and reverse proxy.',
  })
  @Column({ name: 'description', type: 'text' })
  description: string;

  @ApiProperty({
    description: 'List of supported providers',
    example: ['Cisco', 'Fortinet', 'Palo Alto'],
    isArray: true,
  })
  @Column('text', {
    name: 'provider',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  provider: string[];

  @ApiProperty({
    description: 'Allowed network zones',
    example: ['cloud', 'dmz', 'lan'],
    isArray: true,
    enum: ZONE_TYPES,
  })
  @Column('text', {
    name: 'allowed_zones',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  allowedZones: ZoneType[];

  @ApiProperty({
    description: 'Allowed subzones',
    example: ['dmz-web', 'dc-virtual'],
    isArray: true,
  })
  @Column('text', {
    name: 'allowed_subzones',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  allowedSubzones: string[];

  @ApiProperty({
    description: 'Free tags for filtering',
    example: ['waf', 'proxy', 'tls'],
    isArray: true,
  })
  @Column('text', {
    name: 'tags',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  tags: string[];

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
