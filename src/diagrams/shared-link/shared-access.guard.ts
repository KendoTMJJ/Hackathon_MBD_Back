import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SharedLinksService } from './shared-links.service';

@Injectable()
export class SharedAccessGuard implements CanActivate {
  constructor(private readonly sharedLinksService: SharedLinksService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.params.token;

    try {
      const sharedLink = await this.sharedLinksService.getByToken(token);
      
      if (!sharedLink) {
        throw new UnauthorizedException('Token de acceso compartido inválido');
      }

      request.sharedLink = sharedLink;
      return true;
      
    } catch (error) {
      console.error('Error en SharedAccessGuard:', error);
      throw new UnauthorizedException('No tienes acceso a este recurso compartido');
    }
  }
}