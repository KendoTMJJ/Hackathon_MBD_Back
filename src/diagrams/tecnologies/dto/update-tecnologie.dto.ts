// src/tecnologias/dto/update-tecnologia.dto.ts
import { IsString, IsOptional, IsArray, IsEnum, ArrayUnique, IsIn, Matches } from 'class-validator';
import { ZONE_KINDS, ZoneKind } from 'src/entities/tecnologie/tecnologie';

export class UpdateTecnologieDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  imageUrl?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  provider?: string;

  @IsArray() @ArrayUnique() @IsIn(ZONE_KINDS, { each: true })
  allowedZones: ZoneKind[];   

  @IsOptional() @IsArray()
  @ArrayUnique()
  @Matches(/^(cloud|dmz|lan|datacenter|ot)\/[a-z0-9\-]+$/i, { each: true })
  allowedSubzones?: string[];

  @IsOptional() @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];
}
