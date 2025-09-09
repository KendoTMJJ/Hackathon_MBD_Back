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
  ForbiddenException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CollabService } from './collab.service';
import * as jwt from 'jsonwebtoken';

type AuthSocket = Socket & {
  userSub?: string;
  isGuest?: boolean;
  sharedToken?: string;
};

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

  // 👇 Autenticación inicial al conectar
  async handleConnection(client: AuthSocket) {
    try {
      const { token, sharedToken } = client.handshake.auth;

      if (sharedToken) {
        client.userSub = `guest:${sharedToken}`;
        client.isGuest = true;
        client.sharedToken = sharedToken;
        return;
      }

      if (token) {
        const decoded = jwt.decode(token) as any;
        if (!decoded?.sub) throw new Error('JWT inválido');
        client.userSub = decoded.sub;
        client.isGuest = false;
        return;
      }

      client.disconnect();
    } catch (err) {
      console.error('Error en handleConnection:', err);
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

  // 👇 Unirse a documento
  @SubscribeMessage('join')
  async onJoin(
    @MessageBody() data: { documentId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
    if (!client.userSub) throw new UnauthorizedException('No autenticado');

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

  // 👇 Aplicar cambios
  @SubscribeMessage('change')
  async onChange(
    @MessageBody() payload: { documentId: string; version: number; ops: any },
    @ConnectedSocket() client: AuthSocket,
  ) {
    if (!client.userSub) throw new UnauthorizedException('No autenticado');

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
      console.error('Error en change:', err);
      if (err instanceof ConflictException) {
        client.emit('change:error', {
          type: 'version_conflict',
          message: 'El documento ha cambiado, recarga el estado',
        });
      }
      throw err;
    }
  }

  // 👇 Presencia (cursor, selección)
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
    if (!client.userSub) return;

    const room = `doc:${data.documentId}`;
    client.to(room).emit('presence', {
      userSub: client.userSub,
      kind: client.isGuest ? 'guest' : 'user',
      cursor: data.cursor,
      selection: data.selection,
      timestamp: Date.now(),
    });
  }

  // 👇 Salir de documento
  @SubscribeMessage('leave')
  async onLeave(
    @MessageBody() data: { documentId: string },
    @ConnectedSocket() client: AuthSocket,
  ) {
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
