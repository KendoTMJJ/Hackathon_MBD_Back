import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UserDto {
  @IsString() id!: string;
  @IsString() name!: string;
  @IsString() color!: string;
}

class ChangeDto {
  @IsIn([
    'nodes',
    'edges',
    'sheet_update',
    'sheet_create',
    'sheet_delete',
    'sheet_reorder',
  ])
  type!:
    | 'nodes'
    | 'edges'
    | 'sheet_update'
    | 'sheet_create'
    | 'sheet_delete'
    | 'sheet_reorder';

  @IsObject()
  data!: any;

  @IsString()
  userId!: string;

  @IsNumber()
  timestamp!: number;

  @IsOptional()
  @IsString()
  sheetId?: string;
}

class CursorDto {
  @Type(() => Number)
  @IsNumber()
  x!: number;

  @Type(() => Number)
  @IsNumber()
  y!: number;
}

export class JoinPayload {
  @IsString() documentId!: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @ValidateNested()
  @Type(() => UserDto)
  user!: UserDto;
}

export class ChangePayload {
  @IsString() documentId!: string;

  @ValidateNested()
  @Type(() => ChangeDto)
  change!: ChangeDto;
}

export class CursorPayload {
  @IsString() documentId!: string;

  @IsString() userId!: string;

  @ValidateNested()
  @Type(() => CursorDto)
  cursor!: CursorDto;
}
