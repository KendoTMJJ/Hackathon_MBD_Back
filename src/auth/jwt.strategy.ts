// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const domain = process.env.AUTH0_DOMAIN; // sin https ni slash
    const audience = process.env.AUTH0_AUDIENCE; // debe coincidir con "aud" del token

    // Log de arranque (útil para verificar que leyó bien el .env)
    console.log('[JWT] domain=', domain, 'audience=', audience);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer: `https://${domain}/`,
      audience,
      algorithms: ['RS256'],
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        jwksUri: `https://${domain}/.well-known/jwks.json`,
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
      }),
    });
  }

  async validate(payload: any) {
    // Descomenta temporalmente para confirmar que entra aquí:
    // console.log('[JWT] payload:', payload);
    return payload; // req.user = payload
  }
}
