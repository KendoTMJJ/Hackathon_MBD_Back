// Importación de etiquetas de typeORM y desripción de cada atributo al momento de entrar a /api
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * enum: permite trabajar con constantes(números) en cada una de las zonas,
 * ayuda a identificar si la tecnologia puede este permitida o no en la zona.
 */
export const ZONE_KINDS = ['cloud', 'dmz', 'lan', 'datacenter', 'ot'] as const;
export type ZoneKind = (typeof ZONE_KINDS)[number];

@Entity('Tecnologie', { schema: 'public' })
@Unique(['name'])
export class Tecnologie {
  @ApiProperty({ description: 'ID de la tecnología', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'cod_tecnologie' })
  id: string;

  /** Primera columna "name" de tipo único */
  @ApiProperty({ description: 'Nombre', example: 'NGINX' })
  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  /** Segunda columna "imageUrl", a través de rutas locales */
  @ApiProperty({
    description: 'Ruta local de la imagen',
    example: '/src/images/nginx.png',
  })
  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: false })
  imageUrl: string;

  /** Tercera columna "description", tipo text */
  @ApiProperty({
    description: 'Descripción',
    example: 'Proxy reverso y servidor web de alto rendimiento.',
  })
  @Column({ name: 'description', type: 'text' })
  description: string;

  /**
   * (NUEVO) Lista de proveedores.
   * Recomendado usar este campo como fuente de verdad.
   */
  @ApiProperty({
    description: 'Lista de proveedores',
    example: ['Palo Alto Networks', 'Fortinet', 'Cisco'],
    isArray: true,
  })
  @Column('text', {
    name: 'providers',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  providers: string[];

  @ApiProperty({
    description: 'Zonas permitidas',
    example: ['cloud', 'dmz', 'lan'],
    isArray: true,
    enum: ZONE_KINDS,
  })
  @Column('text', {
    name: 'allowed_zones',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  allowedZones: ZoneKind[];

  @ApiProperty({
    description: 'Subzonas permitidas',
    example: ['dmz-web-gateway', 'dc-virtual-servers'],
    isArray: true,
  })
  @Column('text', {
    name: 'allowed_subzones',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  allowedSubzones?: string[];

  /** Etiquetas libres para búsqueda/filtrado */
  @ApiProperty({
    description: 'Etiquetas libres',
    example: ['waf', 'proxy', 'tls'],
    isArray: true,
  })
  @Column('text', {
    name: 'tags',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  tags?: string[];

  /** Timestamps */
  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
