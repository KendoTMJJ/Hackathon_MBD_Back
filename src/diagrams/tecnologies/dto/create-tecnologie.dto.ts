import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ArrayUnique,
  IsIn,
  Matches,
} from 'class-validator';
import { ZONE_TYPES, ZoneType } from 'src/entities/tecnologie/tecnology';

export class CreateTecnologieDto {
  @IsString()
  name: string;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  provider: string[];

  @IsArray()
  @ArrayUnique()
  @IsIn(ZONE_TYPES, { each: true })
  allowedZones: ZoneType[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Matches(/^(cloud|dmz|lan|datacenter|ot)\/[a-z0-9\-]+$/i, { each: true })
  allowedSubzones?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];
}
