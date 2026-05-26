import {
    WebSocketGateway, WebSocketServer, SubscribeMessage,
    OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { FcmService } from '../fcm/fcm.service';
import { PushNotifSource } from '../fcm/push-notification-log.entity';

interface JoinPayload { sessionId?: string; visitorName?: string; }
interface MessagePayload { sessionId: string; content: string; }
interface TypingPayload { sessionId: string; isTyping: boolean; }
interface AdminSelectPayload { sessionId: string; }

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    /** socketId -> sessionId mapping for visitors */
    private visitorSockets = new Map<string, string>();
    /** sessionId -> Set of admin socketIds */
    private adminSessions = new Map<string, Set<string>>();
    /** socketId -> true if admin */
    private adminSockets = new Set<string>();

    constructor(private readonly chatService: ChatService, private readonly fcm: FcmService) { }

    handleConnection(client: Socket) {
        // connection established; role determined on first event
    }

    handleDisconnect(client: Socket) {
        const sessionId = this.visitorSockets.get(client.id);
        if (sessionId) {
            this.visitorSockets.delete(client.id);
            // notify admins that visitor disconnected
            this.server.to('admins').emit('visitor:disconnected', { sessionId });
        }
        this.adminSockets.delete(client.id);
        // remove from any watched sessions
        for (const [sid, admins] of this.adminSessions.entries()) {
            admins.delete(client.id);
            if (admins.size === 0) this.adminSessions.delete(sid);
        }
    }

    // ─── Visitor events ───────────────────────────────────────────────────────

    @SubscribeMessage('visitor:join')
    async onVisitorJoin(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: JoinPayload,
    ) {
        let session = payload.sessionId
            ? await this.chatService.getSession(payload.sessionId)
            : null;

        if (!session) {
            session = await this.chatService.createSession(payload.visitorName ?? 'Visitor');
        }

        this.visitorSockets.set(client.id, session.id);
        client.join(`session:${session.id}`);

        const messages = await this.chatService.getMessages(session.id);

        // notify all admins of new/resumed session
        const sessions = await this.chatService.getAllSessions();
        this.server.to('admins').emit('sessions:update', sessions);

        return { sessionId: session.id, messages };
    }

    @SubscribeMessage('visitor:message')
    async onVisitorMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: MessagePayload,
    ) {
        const sessionId = this.visitorSockets.get(client.id) ?? payload.sessionId;
        if (!sessionId) return;

        const msg = await this.chatService.saveMessage(sessionId, payload.content, 'visitor');

        // broadcast to admins
        this.server.to('admins').emit('message:new', msg);

        // push notification for new visitor message
        this.fcm.sendPush({
            title: '💬 New Chat Message',
            body: `Visitor: "${payload.content.slice(0, 80)}"`,
            url: '/admin/dashboard',
            source: PushNotifSource.CHAT,
        });

        // update sessions list for admins
        const sessions = await this.chatService.getAllSessions();
        this.server.to('admins').emit('sessions:update', sessions);

        return msg;
    }

    @SubscribeMessage('visitor:typing')
    onVisitorTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: TypingPayload,
    ) {
        this.server.to('admins').emit('visitor:typing', payload);
    }

    // ─── Admin events ─────────────────────────────────────────────────────────

    @SubscribeMessage('admin:join')
    async onAdminJoin(@ConnectedSocket() client: Socket) {
        this.adminSockets.add(client.id);
        client.join('admins');
        const sessions = await this.chatService.getAllSessions();
        return sessions;
    }

    @SubscribeMessage('admin:select_session')
    async onAdminSelectSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: AdminSelectPayload,
    ) {
        client.join(`session:${payload.sessionId}`);
        if (!this.adminSessions.has(payload.sessionId)) {
            this.adminSessions.set(payload.sessionId, new Set());
        }
        this.adminSessions.get(payload.sessionId)!.add(client.id);

        await this.chatService.markSessionRead(payload.sessionId);
        const messages = await this.chatService.getMessages(payload.sessionId);

        // update sessions list to clear unread
        const sessions = await this.chatService.getAllSessions();
        this.server.to('admins').emit('sessions:update', sessions);

        return messages;
    }

    @SubscribeMessage('admin:message')
    async onAdminMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: MessagePayload,
    ) {
        if (!this.adminSockets.has(client.id)) return;

        const msg = await this.chatService.saveMessage(payload.sessionId, payload.content, 'admin');

        // deliver to visitor in that session room
        this.server.to(`session:${payload.sessionId}`).emit('message:new', msg);

        return msg;
    }

    @SubscribeMessage('admin:typing')
    onAdminTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: TypingPayload,
    ) {
        if (!this.adminSockets.has(client.id)) return;
        this.server.to(`session:${payload.sessionId}`).emit('admin:typing', payload);
    }

    @SubscribeMessage('admin:close_session')
    async onAdminCloseSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sessionId: string },
    ) {
        if (!this.adminSockets.has(client.id)) return;
        await this.chatService.closeSession(payload.sessionId);
        this.server.to(`session:${payload.sessionId}`).emit('session:closed', { sessionId: payload.sessionId });
        const sessions = await this.chatService.getAllSessions();
        this.server.to('admins').emit('sessions:update', sessions);
    }
}
