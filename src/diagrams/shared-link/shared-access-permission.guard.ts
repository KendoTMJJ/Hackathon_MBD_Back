import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';

@Injectable()
export class SharedEditPermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const sharedLink = request.sharedLink;

    if (!sharedLink) {
      throw new BadRequestException('Información del enlace compartido no disponible');
    }

    if (sharedLink.permission !== 'edit') {
      throw new BadRequestException('No tienes permisos de edición en este documento');
    }

    return true;
  }
}