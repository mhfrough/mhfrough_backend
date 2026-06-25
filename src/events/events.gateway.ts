import {
    WebSocketGateway, WebSocketServer, SubscribeMessage,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { wsCorsOrigins } from '../common/ws-cors';
import { verifyAdminSocket } from '../common/ws-admin-auth';

@WebSocketGateway({
    cors: { origin: wsCorsOrigins(), credentials: true },
    namespace: '/events',
})
export class EventsGateway {
    @WebSocketServer()
    server: Server;

    constructor(private readonly jwt: JwtService) { }

    /** Admin clients call this to receive admin-only events */
    @SubscribeMessage('join_admin')
    async onJoinAdmin(@ConnectedSocket() client: Socket) {
        // Only authenticated admins may join the room that receives admin-only
        // events (force-logout notices, account-unlock, etc.). Previously any
        // anonymous client could join and eavesdrop on these.
        const admin = await verifyAdminSocket(client, this.jwt);
        if (!admin) {
            client.emit('admin:unauthorized');
            return;
        }
        client.join('admin');
    }

    /** Emit only to admin room */
    emitToAdmin<T>(event: string, data: T): void {
        this.server.to('admin').emit(event, data);
    }

    /** Emit to all connected clients (public + admin) */
    emitToAll<T>(event: string, data: T): void {
        this.server.emit(event, data);
    }
}
