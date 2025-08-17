import { IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({
    description: 'Template title',
    example: 'Security Architecture Template'
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Template data as JSON object',
    example: { nodes: [], edges: [] }
  })
  @IsObject()
  data: Record<string, any>;

  @ApiProperty({
    description: 'Project ID this template belongs to',
    example: 'uuid-project-id'
  })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'Template description',
    example: 'A comprehensive security architecture template',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;
}
