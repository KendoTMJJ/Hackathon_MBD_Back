import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SharedLinkRequest } from './shared-access.guard';

@Injectable()
export class SharedEditPermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<SharedLinkRequest>();
    const sharedLink = req.sharedLink;

    if (!sharedLink) {
      throw new BadRequestException(
        'No se encontró el enlace compartido en la solicitud',
      );
    }
    if (sharedLink.permission !== 'edit') {
      throw new ForbiddenException(
        'No tienes permisos de edición en este documento',
      );
    }
    return true;
  }
}
