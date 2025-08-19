import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';

export enum SharePermission {
  READ = 'read',
  EDIT = 'edit',
}

export class CreateShareLinkDto {
  @IsEnum(SharePermission)
  permission: SharePermission;

  @IsOptional()
  @IsDateString()
  expiresAt?: string; // ISO string, opcional

  @IsOptional()
  @IsString()
  password?: string; // opcional, para links protegidos
  
}