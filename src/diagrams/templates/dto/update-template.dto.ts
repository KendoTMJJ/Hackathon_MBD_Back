import { IsString, IsObject, IsOptional, IsInt } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class UpdateTemplateDto {
  @ApiProperty({
    description: "Template version number",
    example: 2,
  })
  @IsInt()
  version: number

  @ApiProperty({
    description: "Updated template data",
    example: { nodes: [], edges: [] },
  })
  @IsObject()
  data: Record<string, any>

  @ApiProperty({
    description: "Updated template title",
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string

  @ApiProperty({
    description: "Updated template description",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string
}
