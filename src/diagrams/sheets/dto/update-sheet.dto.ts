import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';

export class UpdateSheetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}