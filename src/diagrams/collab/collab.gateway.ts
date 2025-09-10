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
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { CollabService } from './collab.service';
import { SheetsService } from '../sheets/sheets.service';

type Role = 'read' | 'edit';

interface Ctx {
  documentId: string;
  role: Role;
  userSub: string | null;
  isGuest: boolean;
  sharedToken?: string;
}

type AuthSocket = Socket & {
  ctx?: Ctx;
  isGuest?: boolean;
  sharedToken?: string;
  userSub?: string | null;
};

@WebSocketGateway({
  namespace: '/collab',
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
@Injectable()
export class CollabGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private bySocket = new Map<string, Ctx>();

  constructor(
    private readonly sheets: SheetsService,
    private readonly collabService: CollabService,
  ) {}

  /* ===================== CONEXIÓN ===================== */
  async handleConnection(client: AuthSocket) {
    try {
      const auth = (client.handshake.auth || {}) as {
        type?: 'user' | 'guest';
        token?: string;           // (si luego validas JWT)
        sharedToken?: string;
        sharedPassword?: string;  // (si lo usas en service)
        sub?: string;             // opcional
      };

      // NO EXIGIMOS documentId AQUÍ. Se valida en 'join'.
      client.isGuest = auth.type === 'guest' && !!auth.sharedToken;
      client.sharedToken = auth.sharedToken;
      client.userSub = client.isGuest
        ? `guest:${auth.sharedToken}:${client.id}`
        : (auth.sub ?? null);

      // ctx “placeholder” sin documentId hasta el join
      client.ctx = {
        documentId: '',
        role: 'read',
        userSub: client.userSub ?? null,
        isGuest: !!client.isGuest,
        sharedToken: client.sharedToken,
      };
      this.bySocket.set(client.id, client.ctx);

      // útil para depurar
      // console.log('[collab] WS connected', { sid: client.id, guest: client.isGuest });
      client.emit('ws:ready');
    } catch (e) {
      // console.error('[collab] handleConnection error', e);
      client.emit('ws:deny', { message: 'connection failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket) {
    const ctx = this.bySocket.get(client.id);
    if (ctx && ctx.documentId) {
      this.server.to(this.docRoom(ctx.documentId)).emit('presence:left', {
        userSub: ctx.userSub ?? 'guest',
        kind: ctx.isGuest ? 'guest' : 'user',
      });
    }
    this.bySocket.delete(client.id);
  }

  private docRoom(documentId: string) {
    return `doc:${documentId}`;
  }

  /* ===================== JOIN ===================== */
  @SubscribeMessage('join')
  async onJoin(
    @MessageBody() data: { documentId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    const ctx = this.bySocket.get(client.id);
    if (!ctx) throw new UnauthorizedException('Handshake not established');
    if (!data?.documentId) throw new UnauthorizedException('documentId required');

    // calcular permisos según si es invitado o user
    const perm = await this.collabService.getPermissions(
      data.documentId,
      ctx.isGuest ? undefined : ctx.userSub ?? undefined,
      ctx.isGuest ? ctx.sharedToken : undefined,
    );
    console.log('[collab] join perm:', perm, { guest: ctx.isGuest, sharedToken: ctx.sharedToken });

    if (!perm) throw new ForbiddenException('No access to document');

    ctx.documentId = data.documentId;
    ctx.role = perm;
    this.bySocket.set(client.id, ctx);

    await client.join(this.docRoom(ctx.documentId));

    this.server.to(this.docRoom(ctx.documentId)).emit('presence:joined', {
      userSub: ctx.userSub ?? 'guest',
      kind: ctx.isGuest ? 'guest' : 'user',
      timestamp: Date.now(),
    });

    const snapshot = await this.collabService.getSnapshot(ctx.documentId);

    // console.log('[collab] join ACK', { sid: client.id, doc: ctx.documentId, role: ctx.role });
    return { ok: true, snapshot, permission: ctx.role, userSub: ctx.userSub };
  }

  /* ===================== CAMBIOS (ACK versión) ===================== */
  @SubscribeMessage('change')
  async onChange(
    @MessageBody() payload: { documentId: string; version: number; ops: any },
    @ConnectedSocket() client: AuthSocket,
  ) {
    const ctx = this.bySocket.get(client.id);
    if (!ctx) throw new UnauthorizedException('Handshake not established');
    if (!payload?.documentId || payload.documentId !== ctx.documentId) {
      throw new UnauthorizedException('Invalid documentId');
    }
    if (ctx.role !== 'edit') throw new ForbiddenException('Readonly');

    try {
      const next = await this.collabService.applyOps(
        ctx.documentId,
        payload.version,
        payload.ops,
        ctx.userSub ?? 'unknown',
        !!ctx.isGuest,
      );

      client.to(this.docRoom(ctx.documentId)).emit('change', {
        version: next.version,
        ops: next.appliedOps,
        actor: ctx.userSub,
        timestamp: Date.now(),
      });

      return { ok: true, version: next.version };
    } catch (err) {
      // console.error('[collab] change error', err);
      if (err instanceof ConflictException) {
        client.emit('change:error', {
          type: 'version_conflict',
          message: 'El documento ha cambiado, recarga el estado',
        });
      }
      throw err;
    }
  }

  /* ===================== PRESENCIA ===================== */
  @SubscribeMessage('presence')
  async onPresence(
    @MessageBody() data: { documentId: string; cursor?: { x: number; y: number }; selection?: any },
    @ConnectedSocket() client: AuthSocket,
  ) {
    const ctx = this.bySocket.get(client.id);
    if (!ctx || !data?.documentId || data.documentId !== ctx.documentId) return;

    client.to(this.docRoom(ctx.documentId)).emit('presence', {
      userSub: ctx.userSub,
      kind: ctx.isGuest ? 'guest' : 'user',
      cursor: data.cursor,
      selection: data.selection,
      timestamp: Date.now(),
    });
  }

  /* ===================== LEAVE ===================== */
  @SubscribeMessage('leave')
  async onLeave(
    @MessageBody() data: { documentId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    const ctx = this.bySocket.get(client.id);
    if (!ctx || !data?.documentId || data.documentId !== ctx.documentId) {
      return { ok: true };
    }
    await client.leave(this.docRoom(ctx.documentId));
    this.server.to(this.docRoom(ctx.documentId)).emit('presence:left', {
      userSub: ctx.userSub,
      kind: ctx.isGuest ? 'guest' : 'user',
    });
    return { ok: true };
  }

  /* ===================== PATCH HOJA (con versión) ===================== */
  @SubscribeMessage('sheet:patch')
  async onSheetPatch(
    @MessageBody() body: { sheetId: string; nodes?: any[]; edges?: any[]; baseVersion?: number },
    @ConnectedSocket() client: AuthSocket,
  ) {
    const ctx = this.bySocket.get(client.id);
    if (!ctx) throw new UnauthorizedException('Handshake not established');
    if (ctx.role !== 'edit') throw new ForbiddenException('Readonly');

    const res = await this.sheets.applyPatchWithVersion({
      sheetId: body.sheetId,
      baseVersion: body.baseVersion ?? 0,
      nodes: body.nodes,
      edges: body.edges,
      patch: undefined,
      actor: ctx.userSub ?? 'unknown',
    });

    this.server.to(this.docRoom(res.documentId)).emit('sheet:snapshot', {
      sheetId: res.sheetId,
      nodes: res.nodes,
      edges: res.edges,
      version: res.version,
      actor: ctx.userSub,
      timestamp: Date.now(),
    });

    return { ok: true, version: res.version };
  }
}