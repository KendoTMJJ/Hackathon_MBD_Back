// src/auth/ws-jwt.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as jwksRsa from 'jwks-rsa';

const jwksClient = jwksRsa({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000, // 10 min
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
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

    // Resolver public key de forma robusta
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
export class WsJwtGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const client: any = ctx.switchToWs().getClient();

    // 1) auth.token en handshake (cliente socket.io)
    let token: string | undefined = client?.handshake?.auth?.token;

    // 2) fallback: Authorization header (por si vino de un proxy o lib custom)
    if (!token) {
      const raw = client?.handshake?.headers?.authorization as
        | string
        | undefined;
      if (raw) token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    }

    if (!token) throw new UnauthorizedException('Missing WS token');

    try {
      const decoded = await verifyJwt(token);
      client.user = decoded; // guarda { sub, ... } en el socket
      return true;
    } catch (e: any) {
      throw new UnauthorizedException(e?.message ?? 'Invalid WS token');
    }
  }
}
