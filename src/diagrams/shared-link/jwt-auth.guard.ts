// src/auth/jwt-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwksRsa from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';

const jwksClient = jwksRsa({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000, // 10 min
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

/**
 * Adaptador compatible con jsonwebtoken: resuelve la public key a partir del kid.
 * Maneja correctamente tipos de jwks-rsa y evita el error "key is possibly undefined".
 */
const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
  console.log('[ENV] AUDIENCE=', JSON.stringify(process.env.AUTH0_AUDIENCE));
  console.log('[ENV] DOMAIN  =', JSON.stringify(process.env.AUTH0_DOMAIN));

  const kid = header.kid;
  if (!kid)
    return callback(new Error('Missing kid in token header'), undefined as any);

  jwksClient.getSigningKey(kid, (err, key) => {
    if (err || !key) {
      return callback(
        err ?? new Error('Signing key not found'),
        undefined as any,
      );
    }

    // jwks-rsa expone varias formas según la versión/algoritmo.
    // Preferimos getPublicKey(); si no está, probamos publicKey/rsaPublicKey.
    const anyKey = key as any;
    const signingKey: string =
      (typeof key.getPublicKey === 'function' && key.getPublicKey()) ||
      anyKey.publicKey ||
      anyKey.rsaPublicKey;

    if (!signingKey) {
      return callback(
        new Error('Cannot resolve a public key from JWKS'),
        undefined as any,
      );
    }

    callback(null, signingKey);
  });
};

function verifyJwt(token: string): Promise<jwt.JwtPayload | string> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        audience: process.env.AUTH0_AUDIENCE,
        issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      },
      (err, decoded) => (err ? reject(err) : resolve(decoded!)),
    );
  });
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const raw = (req.headers.authorization as string) || '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;

    console.log(token);

    if (!token) throw new UnauthorizedException('No token');

    try {
      const decoded = await verifyJwt(token);
      (req as any).user = decoded;
      return true;
    } catch (e: any) {
      throw new UnauthorizedException(e?.message ?? 'Invalid token');
    }
  }
}
