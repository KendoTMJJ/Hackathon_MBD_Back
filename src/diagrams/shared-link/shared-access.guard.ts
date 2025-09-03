import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { SharedLinksService } from './shared-links.service';
import { Request } from 'express';
import { SharedLink } from '../../entities/shared-link/shared-link';

export interface SharedLinkRequest extends Request {
  sharedLink: SharedLink;
}

@Injectable()
export class SharedAccessGuard implements CanActivate {
  constructor(private readonly sharedLinks: SharedLinksService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<SharedLinkRequest>();

    // token en ruta: /shared/:token/...
    const token =
      req.params?.token ??
      (typeof req.query?.token === 'string' ? req.query.token : undefined);

    if (!token) {
      throw new BadRequestException('Token de acceso compartido faltante');
    }

    // password opcional por query: ?password=...
    const password =
      typeof req.query?.password === 'string' ? req.query.password : undefined;

    // ⬇ devuelve ENTIDAD COMPLETA (con documentId, permission, etc.)
    const link = await this.sharedLinks.getByToken(token, password);
    req.sharedLink = link;
    return true;
  }
}
