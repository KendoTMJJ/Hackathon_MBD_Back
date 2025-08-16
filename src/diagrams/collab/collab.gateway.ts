import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({ namespace: '/collab', cors: { origin: true } })
export class CollabGateway {
  handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth?.token || '').replace('Bearer ', '');
      const payload: any = jwt.decode(token); // para hackathon; en prod valida JWKS
      if (!payload?.sub) throw new Error('no-sub');
      client.data.userSub = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('join')
  join(
    @ConnectedSocket() client: Socket,
    @MessageBody() { documentId }: { documentId: string },
  ) {
    client.join(documentId);
    client
      .to(documentId)
      .emit('presence:join', { userSub: client.data.userSub });
  }

  @SubscribeMessage('change')
  change(
    @ConnectedSocket() client: Socket,
    @MessageBody() msg: { documentId: string; patch: any },
  ) {
    client
      .to(msg.documentId)
      .emit('change', { ...msg, userSub: client.data.userSub, ts: Date.now() });
  }

  @SubscribeMessage('presence')
  presence(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    msg: {
      documentId: string;
      cursor: { x: number; y: number };
      selection?: string[];
    },
  ) {
    client
      .to(msg.documentId)
      .emit('presence', { userSub: client.data.userSub, ...msg });
  }
}
