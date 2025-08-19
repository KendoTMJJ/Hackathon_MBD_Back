import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateSheetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}