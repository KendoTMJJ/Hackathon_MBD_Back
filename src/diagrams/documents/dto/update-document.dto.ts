import { IsInt, IsObject, IsOptional, IsString } from 'class-validator';
export class UpdateDocumentDto {
  @IsInt() version: number;
  @IsObject() data: Record<string, any>;
  @IsOptional() @IsString() title?: string;
}
