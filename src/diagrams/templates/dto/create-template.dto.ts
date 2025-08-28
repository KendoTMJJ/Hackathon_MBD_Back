import { IsString, IsObject, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @IsString()
  title: string;

  @IsIn(['diagram', 'template'])
  kind: 'diagram' | 'template';

  @IsObject()
  data: Record<string, any>;
}
