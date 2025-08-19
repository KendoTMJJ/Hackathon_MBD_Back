import { IsEmail, IsEnum } from 'class-validator';

export enum MemberPermission {
  READ = 'read',
  EDIT = 'edit',
}

export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(MemberPermission)
  permission: MemberPermission;
}