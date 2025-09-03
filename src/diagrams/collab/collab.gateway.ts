// src/diagrams/collab/collab.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WsException,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import dayjs from 'dayjs';

import { Document } from 'src/entities/document/document';
import { Collaborator } from 'src/entities/collaborator/collaborator';
import { SharedLink } from 'src/entities/shared-link/shared-link';

// ⚠️ Ajusta esta ruta si tu servicio vive en otro módulo
import { SharedLinksService } from 'src/diagrams/shared-link/shared-links.service';
import { ChangePayload, CursorPayload, JoinPayload } from './dto/gateway.dto';

type Permission = 'read' | 'edit';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/collab',
})
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CollabGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() io: Server;

  // socketId -> { documentId, permission }
  private session = new Map<
    string,
    { documentId: string; permission: Permission }
  >();

  // documentId -> Map<socketId, { id, name, color }>
  private presence = new Map<
    string,
    Map<string, { id: string; name: string; color: string }>
  >();

  constructor(
    @InjectRepository(Document) private readonly docRepo: Repository<Document>,
    @InjectRepository(Collaborator)
    private readonly collabRepo: Repository<Collaborator>,
    @InjectRepository(SharedLink)
    private readonly linkRepo: Repository<SharedLink>,
    private readonly sharedLinks: SharedLinksService,
  ) {}

  async handleConnection(client: Socket) {
    // Si usas JWT (Auth0, etc.), recupéralo aquí y guarda el sub:
    // const bearer = client.handshake.auth?.token ?? client.handshake.headers.authorization;
    // client.data.sub = await this.verifyJwtAndGetSub(bearer);
  }

  async handleDisconnect(client: Socket) {
    await this.forceLeave(client);
  }

  // -------------------- JOIN / LEAVE --------------------

  @SubscribeMessage('join_document')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ) {
    const { documentId, token, password, user } = payload;

    const doc = await this.docRepo.findOne({ where: { id: documentId } });
    if (!doc) throw new WsException('Documento no encontrado');

    // Si ya estaba en otra room, limpiamos antes
    await this.forceLeave(client);

    const permission = await this.resolvePermission(
      client,
      documentId,
      token,
      password,
    );

    await client.join(documentId);
    this.session.set(client.id, { documentId, permission });
    client.data.user = user;

    const room = this.ensureRoom(documentId);
    room.set(client.id, user);

    // Notificar entrada y enviar lista actualizada
    client.to(documentId).emit('user_joined', user);

    const usersList = Array.from(room.values());
    client.emit(
      'users_list',
      usersList.filter((u) => u.id !== user.id),
    );
    this.io.to(documentId).emit('users_list', usersList);

    // opcional: ack con permiso calculado
    client.emit('join_ack', { permission });
  }

  @SubscribeMessage('leave_document')
  async onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { documentId: string },
  ) {
    await client.leave(body.documentId);
    await this.forceLeave(client);
  }

  // -------------------- CAMBIOS --------------------

  @SubscribeMessage('document_change')
  async onChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: ChangePayload,
  ) {
    const sess = this.session.get(client.id);
    if (!sess || sess.documentId !== body.documentId) {
      throw new WsException('No unido al documento');
    }
    if (sess.permission !== 'edit') {
      throw new WsException('Solo lectura');
    }
    client.to(body.documentId).emit('document_change', body.change);
  }

  // -------------------- CURSORES --------------------

  @SubscribeMessage('cursor_update')
  async onCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: CursorPayload,
  ) {
    const sess = this.session.get(client.id);
    if (!sess || sess.documentId !== body.documentId) return;

    client.to(body.documentId).emit('user_cursor', {
      userId: body.userId,
      cursor: body.cursor,
    });
  }

  // -------------------- HELPERS --------------------

  private ensureRoom(documentId: string) {
    if (!this.presence.has(documentId)) {
      this.presence.set(documentId, new Map());
    }
    return this.presence.get(documentId)!;
  }

  private async forceLeave(client: Socket) {
    const sess = this.session.get(client.id);
    if (!sess) return;

    const { documentId } = sess;
    this.session.delete(client.id);

    const room = this.presence.get(documentId);
    if (!room) return;

    const leftUser = room.get(client.id);
    room.delete(client.id);

    if (leftUser) {
      this.io.to(documentId).emit('user_left', leftUser.id);
    }
    this.io.to(documentId).emit('users_list', Array.from(room.values()));

    if (room.size === 0) this.presence.delete(documentId);
  }

  private async resolvePermission(
    client: Socket,
    documentId: string,
    token?: string,
    password?: string,
  ): Promise<Permission> {
    // 1) Link compartido (valida activo/expiración/password)
    if (token) {
      const link = await this.sharedLinks.getByToken(token, password);
      if (link.documentId !== documentId) {
        throw new WsException('El token no corresponde a este documento');
      }
      if (
        !link.isActive ||
        (link.expiresAt && dayjs(link.expiresAt).isBefore(dayjs()))
      ) {
        throw new WsException('Link inválido o expirado');
      }
      return link.permission;
    }

    // 2) Colaborador autenticado (si guardaste sub en handleConnection)
    const sub: string | undefined =
      client.data?.sub ??
      (typeof client.handshake.auth?.sub === 'string'
        ? client.handshake.auth.sub
        : undefined);

    if (sub) {
      const collab = await this.collabRepo.findOne({
        where: { documentId, userSub: sub },
      });
      if (!collab) throw new WsException('Sin acceso');
      return collab.role === 'reader' ? 'read' : 'edit';
    }

    // 3) Modo dev (sin JWT): variable de entorno para permitir edición
    if (process.env.COLLAB_DEV_ALLOW_EDIT === 'true') return 'edit';
    return 'read';
  }

  // private async verifyJwtAndGetSub(bearer?: string): Promise<string | undefined> {
  //   // Verifica firma del JWT (Auth0/RS256) y devuelve `sub`
  // }
}
