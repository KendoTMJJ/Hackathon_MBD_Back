// Importación de etiquetas de typeORM y desripción de cada atributo al momento de entrar a /api
import { ApiProperty } from '@nestjs/swagger';


import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * enum: permite trabajar con constantes(números) en cada una de las zonas,
 * ayuda a identificar si la tecnologia puede este permitida o no en la zona.
 */
export const ZONE_KINDS = ['cloud', 'dmz', 'lan', 'datacenter', 'ot'] as const;
export type ZoneKind = typeof ZONE_KINDS[number];


@Entity('Tecnologie', { schema: 'public' })
@Unique(['name'])
export class Tecnologie {
  @ApiProperty({ description: 'ID de la tecnología', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'cod_tecnologie' })
  id: string;

  /**
   * Primera columna "name" de tipo unico
   */
  @ApiProperty({ description: 'Nombre', example: 'NGINX' })
  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  /**
   * Segunda columna "imageUrl", a través de rutas locales
   */
  @ApiProperty({description: 'Ruta local de la imagen', example: '/src/images/nginx.png',})
  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: false })
  imageUrl: string;

  /**
   * Tercera columna "description", tipo text
   */
  @ApiProperty({
    description: 'Descripción', example: 'Proxy reverso y servidor web de alto rendimiento.',
  })
  @Column({ name: 'description', type: 'text'})
  description: string;

  /**
   * Cuarta columna "provider", tipo string
   */
  @ApiProperty({
    description: 'Empresa que ofrece el servicio',
    example: 'F5 / NGINX, Inc.',
  })
  @Column({ name: 'provider', type: 'varchar', length: 100 })
  provider: string;

  /**
   * Quinta columna "allowed_zones", tipo text[]
   * si no se le define una zona el arreglo de guerda vacio en vez de null
   */
  @ApiProperty({
  description: 'Zonas permitidas',
  example: ['cloud', 'dmz', 'lan'],
  isArray: true,
  enum: ZONE_KINDS,
  })
  @Column('text', { name: 'allowed_zones', array: true, default: '{}' })
  allowedZones: ZoneKind[];

  @Column('text', { name: 'allowed_subzones', array: true, default: '{}' })
  allowedSubzones?: string[];

  /** Etiquetas libres para búsqueda/filtrado */
  @Column('text', { name: 'tags', array: true, default: '{}' })
  tags?: string[];

  /**
   * Sexta columna "crated_at", tipo timestamp
   */
  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}

