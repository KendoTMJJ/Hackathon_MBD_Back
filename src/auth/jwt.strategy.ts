import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const domain = process.env.AUTH0_DOMAIN; // without https or trailing slash
    const audience = process.env.AUTH0_AUDIENCE; // must match the "aud" claim in the token

    // Startup log (useful to verify that environment variables are loaded correctly)
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

  /**
   * Validates the decoded JWT payload.
   * Whatever is returned here will be assigned to `req.user`.
   */
  async validate(payload: any) {
    return payload;
  }
}
