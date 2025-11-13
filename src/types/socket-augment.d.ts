import 'socket.io';
import type { SharedLink } from '@/entities/shared-link/shared-link'; // ajusta el path
import type { JwtPayload } from 'jsonwebtoken';

declare module 'socket.io' {
  interface Socket {
    user?: (JwtPayload & { sub?: string }) | undefined;
    sharedLink?: SharedLink | undefined;
  }
}

export {};
