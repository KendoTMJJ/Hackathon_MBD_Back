import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
export class CreateDocumentDto {
  @IsString() title: string;
  @IsIn(['diagram', 'template']) kind: 'diagram' | 'template';
  @IsObject() data: Record<string, any>;
  @IsString() projectId: string;
  @IsOptional() @IsString() templateId?: string;
}
