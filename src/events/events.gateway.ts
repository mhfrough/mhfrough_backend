import {
    WebSocketGateway, WebSocketServer, SubscribeMessage,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { wsCorsOrigins } from '../common/ws-cors';

@WebSocketGateway({
    cors: { origin: wsCorsOrigins(), credentials: true },
    namespace: '/events',
})
export class EventsGateway {
    @WebSocketServer()
    server: Server;

    /** Admin clients call this to receive admin-only events */
    @SubscribeMessage('join_admin')
    onJoinAdmin(@ConnectedSocket() client: Socket) {
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
