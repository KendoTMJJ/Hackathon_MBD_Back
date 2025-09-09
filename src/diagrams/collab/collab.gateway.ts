// src/diagrams/collab/collab.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  UnauthorizedException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CollabService } from './collab.service';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

type AuthSocket = Socket & {
  userSub?: string;
  isGuest?: boolean;
  sharedToken?: string;
};

// ── Helpers ENV ────────────────────────────────────────────────────────────────
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`[CollabGateway] Missing env var ${name}`);
  }
  return String(v);
}
function getAuth0Domain(): string {
  // sin protocolo y sin slash final
  return requireEnv('AUTH0_DOMAIN')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}
function getAudience(): string {
  return requireEnv('AUTH0_AUDIENCE');
}

// JWKS perezoso (se crea cuando se necesita, no en import)
let RS256_JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!RS256_JWKS) {
    const domain = getAuth0Domain();
    RS256_JWKS = createRemoteJWKSet(
      new URL(`https://${domain}/.well-known/jwks.json`),
      {
        // menos carga contra Auth0
        cacheMaxAge: 10 * 60 * 1000, // 10 min
        cooldownDuration: 5_000, // espera entre reintentos
      },
    );
  }
  return RS256_JWKS;
}

// ── Gateway ───────────────────────────────────────────────────────────────────
@WebSocketGateway({
  namespace: '/collab',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
@Injectable()
export class CollabGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() io: Server;

  constructor(private readonly svc: CollabService) {}

  // Handshake WS con autenticación
  async handleConnection(client: AuthSocket) {
    try {
      const { token, sharedToken } = (client.handshake.auth || {}) as {
        token?: string;
        sharedToken?: string;
      };

      // Invitado por link compartido
      if (sharedToken) {
        client.userSub = `guest:${sharedToken}`;
        client.isGuest = true;
        client.sharedToken = sharedToken;
        return;
      }

      // Usuario autenticado con JWT RS256 (Auth0)
      if (token) {
        const { payload } = await jwtVerify(token, getJwks(), {
          audience: getAudience(),
          issuer: `https://${getAuth0Domain()}/`,
          algorithms: ['RS256'],
        });
        const sub = (payload as JWTPayload).sub;
        if (!sub) throw new Error('JWT sin sub');
        client.userSub = sub;
        client.isGuest = false;
        return;
      }

      // sin credenciales
      client.disconnect();
    } catch (err) {
      console.error('[CollabGateway] Error en handleConnection:', err);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthSocket) {
    const rooms = Array.from(client.rooms).filter((r) => r !== client.id);
    for (const room of rooms) {
      if (room.startsWith('doc:') && client.userSub) {
        this.io.to(room).emit('presence:left', {
          userSub: client.userSub,
          kind: client.isGuest ? 'guest' : 'user',
        });
      }
    }
  }

  // Unirse a documento
  @SubscribeMessage('join')
  async onJoin(
    @MessageBody() data: { documentId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    if (!client.userSub) throw new UnauthorizedException('No autenticado');
    if (!data?.documentId)
      throw new UnauthorizedException('Documento requerido');

    if (client.isGuest) {
      await this.svc.ensureCanJoin(
        data.documentId,
        client.userSub,
        client.sharedToken,
      );
    } else {
      await this.svc.ensureCanJoin(data.documentId, client.userSub);
    }

    const permission = await this.svc.getPermissions(
      data.documentId,
      client.isGuest ? undefined : client.userSub,
      client.isGuest ? client.sharedToken : undefined,
    );

    const room = `doc:${data.documentId}`;
    await client.join(room);

    this.io.to(room).emit('presence:joined', {
      userSub: client.userSub,
      kind: client.isGuest ? 'guest' : 'user',
      timestamp: Date.now(),
    });

    const snapshot = await this.svc.getSnapshot(data.documentId);
    return { ok: true, snapshot, permission, userSub: client.userSub };
  }

  // Cambios con ACK de versión
  @SubscribeMessage('change')
  async onChange(
    @MessageBody() payload: { documentId: string; version: number; ops: any },
    @ConnectedSocket() client: AuthSocket,
  ) {
    if (!client.userSub) throw new UnauthorizedException('No autenticado');
    if (!payload?.documentId)
      throw new UnauthorizedException('Documento requerido');

    if (client.isGuest) {
      await this.svc.ensureCanEdit(
        payload.documentId,
        client.userSub,
        client.sharedToken,
      );
    } else {
      await this.svc.ensureCanEdit(payload.documentId, client.userSub);
    }

    try {
      const next = await this.svc.applyOps(
        payload.documentId,
        payload.version,
        payload.ops,
        client.userSub,
        client.isGuest,
      );

      const room = `doc:${payload.documentId}`;
      client.to(room).emit('change', {
        version: next.version,
        ops: next.appliedOps,
        actor: client.userSub,
        timestamp: Date.now(),
      });

      return { ok: true, version: next.version };
    } catch (err) {
      console.error('[CollabGateway] Error en change:', err);
      if (err instanceof ConflictException) {
        client.emit('change:error', {
          type: 'version_conflict',
          message: 'El documento ha cambiado, recarga el estado',
        });
      }
      throw err;
    }
  }

  // Presencia
  @SubscribeMessage('presence')
  async onPresence(
    @MessageBody()
    data: {
      documentId: string;
      cursor?: { x: number; y: number };
      selection?: any;
    },
    @ConnectedSocket() client: AuthSocket,
  ) {
    if (!client.userSub || !data?.documentId) return;
    const room = `doc:${data.documentId}`;
    client.to(room).emit('presence', {
      userSub: client.userSub,
      kind: client.isGuest ? 'guest' : 'user',
      cursor: data.cursor,
      selection: data.selection,
      timestamp: Date.now(),
    });
  }

  // Salir
  @SubscribeMessage('leave')
  async onLeave(
    @MessageBody() data: { documentId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    if (!data?.documentId) return { ok: true };

    const room = `doc:${data.documentId}`;
    await client.leave(room);

    if (client.userSub) {
      this.io.to(room).emit('presence:left', {
        userSub: client.userSub,
        kind: client.isGuest ? 'guest' : 'user',
      });
    }
    return { ok: true };
  }
}
