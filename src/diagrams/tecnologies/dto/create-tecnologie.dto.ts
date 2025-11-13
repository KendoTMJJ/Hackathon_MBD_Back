import {
  IsString,
  IsOptional,
  IsArray,
  ArrayUnique,
  IsIn,
  Matches,
} from 'class-validator';
import { ZONE_TYPES, ZoneType } from 'src/entities/tecnologie/tecnology';

export class CreateTecnologieDto {
  @IsString()
  name: string;

  @IsOptional() // porque la entidad permite null
  @IsString()
  imageUrl?: string;

  @IsString() // ahora es obligatorio, igual que la entidad
  description: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  provider: string[];

  @IsArray()
  @ArrayUnique()
  @IsIn(ZONE_TYPES, { each: true })
  allowedZones: ZoneType[];

  @IsOptional() // la entidad tiene default []
  @IsArray()
  @ArrayUnique()
  @Matches(/^[a-z0-9\-]+$/i, { each: true })
  allowedSubzones?: string[];

  @IsOptional() // la entidad tiene default []
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];
}
