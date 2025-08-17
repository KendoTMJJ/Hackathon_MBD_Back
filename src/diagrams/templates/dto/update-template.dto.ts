import { IsInt, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateTemplateDto {
  @IsInt()
  version: number;

  @IsObject()
  data: Record<string, any>;

  @IsOptional()
  @IsString()
  title?: string;
}
