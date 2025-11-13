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

/**
 * Extended Socket interface with authentication properties
 */
type AuthSocket = Socket & {
  userSub?: string;
  isGuest?: boolean;
  sharedToken?: string;
};

// ── Environment Helpers ──────────────────────────────────────────────────────

/**
 * Retrieves required environment variable
 *
 * @param name - Environment variable name
 * @returns Environment variable value
 * @throws Error when variable is missing or empty
 */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`[CollabGateway] Missing env var ${name}`);
  }
  return String(v);
}

/**
 * Retrieves and normalizes Auth0 domain
 *
 * @returns Auth0 domain without protocol or trailing slash
 */
function getAuth0Domain(): string {
  return requireEnv('AUTH0_DOMAIN')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}

/**
 * Retrieves Auth0 audience
 *
 * @returns Auth0 audience identifier
 */
function getAudience(): string {
  return requireEnv('AUTH0_AUDIENCE');
}

/**
 * Lazy-loaded JWKS for RS256 token verification
 */
let RS256_JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Retrieves JWKS instance for token verification
 *
 * @returns JWKS instance with caching configuration
 */
function getJwks() {
  if (!RS256_JWKS) {
    const domain = getAuth0Domain();
    RS256_JWKS = createRemoteJWKSet(
      new URL(`https://${domain}/.well-known/jwks.json`),
      {
        cacheMaxAge: 10 * 60 * 1000, // 10 minutes
        cooldownDuration: 5_000, // 5 seconds between retries
      },
    );
  }
  return RS256_JWKS;
}

// ── WebSocket Gateway ────────────────────────────────────────────────────────

/**
 * WebSocket gateway for real-time document collaboration
 *
 * @remarks
 * Handles real-time collaboration features including:
 * - Document joining/leaving
 * - Operational transformation with optimistic locking
 * - User presence and cursor sharing
 * - Support for both authenticated users and guest access via share links
 *
 * @publicApi
 */
@WebSocketGateway({
  namespace: '/collab',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
@Injectable()
export class CollabGateway implements OnGatewayConnection, OnGatewayDisconnect {
  /**
   * Socket.IO server instance
   */
  @WebSocketServer() io: Server;

  /**
   * Initializes the CollabGateway with service dependency
   *
   * @param svc - Service handling collaboration business logic
   */
  constructor(private readonly svc: CollabService) {}

  /**
   * Handles new WebSocket connections with authentication
   *
   * @param client - The connecting socket client
   *
   * @remarks
   * Supports two authentication methods:
   * 1. Guest access via share link token
   * 2. Authenticated access via JWT RS256 tokens (Auth0)
   * Disconnects clients that fail authentication
   */
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

  /**
   * Handles WebSocket disconnections and cleans up presence
   *
   * @param client - The disconnecting socket client
   */
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

  /**
   * Handles joining a document collaboration session
   *
   * @param data - Join request data containing documentId
   * @param client - The authenticated socket client
   * @returns Join response with snapshot and permissions
   * @throws {UnauthorizedException} When client is not authenticated
   *
   * @remarks
   * Validates permissions, joins document room, and broadcasts presence
   * Automatically increments share link usage for guest users
   */
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
      // Increment share link usage once per session
      await this.svc.incrementShareUseOnce(client.sharedToken!);
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

  /**
   * Handles document change operations with version control
   *
   * @param payload - Change payload with documentId, version, and operations
   * @param client - The authenticated socket client
   * @returns Change response with new version
   * @throws {UnauthorizedException} When client is not authenticated
   * @throws {ConflictException} When version conflict occurs
   *
   * @remarks
   * Uses optimistic locking to prevent conflicts
   * Broadcasts changes to other clients in the document room
   * Handles version conflicts with appropriate error responses
   */
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

  /**
   * Handles user presence updates (cursor position, selection)
   *
   * @param data - Presence data including cursor and selection information
   * @param client - The authenticated socket client
   *
   * @remarks
   * Broadcasts presence information to other clients in the document room
   * Used for real-time cursor sharing and selection highlighting
   */
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

  /**
   * Handles leaving a document collaboration session
   *
   * @param data - Leave request data containing documentId
   * @param client - The authenticated socket client
   * @returns Leave confirmation
   *
   * @remarks
   * Removes client from document room and broadcasts leave presence
   */
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
