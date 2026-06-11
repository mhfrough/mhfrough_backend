import {
    WebSocketGateway, WebSocketServer, SubscribeMessage,
    OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { FcmService } from '../fcm/fcm.service';
import { PushNotifSource } from '../fcm/push-notification-log.entity';
import { AiService } from '../ai/ai.service';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';
import { LeadsService } from '../leads/leads.service';
import { wsCorsOrigins } from '../common/ws-cors';

interface JoinPayload {
    sessionId?: string;
    visitorName?: string;
    visitorSessionId?: string;
    contactEmail?: string;
    contactPhone?: string;
}
interface MessagePayload { sessionId: string; content: string; }
interface TypingPayload { sessionId: string; isTyping: boolean; }
interface AdminSelectPayload { sessionId: string; }
interface AudioMessagePayload { sessionId: string; audioUrl: string; }
interface FileMessagePayload {
    sessionId: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    caption?: string;
}

@WebSocketGateway({
    cors: {
        origin: wsCorsOrigins(),
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

    /** Matches the first email address found in a chat message */
    private static readonly EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
    /** Matches a plausible phone number (7+ digits, allowing spaces/dashes/parens) */
    private static readonly PHONE_RE = /(\+?\d[\d\s().-]{6,}\d)/;

    constructor(
        private readonly chatService: ChatService,
        private readonly fcm: FcmService,
        private readonly aiService: AiService,
        private readonly adminSettings: AdminSettingsService,
        private readonly leadsService: LeadsService,
    ) { }

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

        // Don't reuse a closed session — always create a fresh one
        if (!session || session.status === 'closed') {
            let leadId: string | null = null;
            if (payload.contactEmail) {
                const lead = await this.leadsService.findOrCreateFromChat({
                    name: payload.visitorName ?? 'Visitor',
                    email: payload.contactEmail,
                    phone: payload.contactPhone,
                });
                leadId = lead.id;
            }
            session = await this.chatService.createSession(
                payload.visitorName ?? 'Visitor',
                payload.visitorSessionId,
                leadId,
            );
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

        // If we don't have a lead for this visitor yet, see if they just shared their contact info
        await this.tryCaptureLeadFromMessage(sessionId, payload.content);

        // update sessions list for admins
        const sessions = await this.chatService.getAllSessions();
        this.server.to('admins').emit('sessions:update', sessions);

        // Fire-and-forget AI auto-reply
        this.tryAiAutoReply(sessionId, payload.content);

        return msg;
    }

    /**
     * Detects an email (and optional phone number) the visitor typed into the
     * chat, and links/creates a Lead so the conversation isn't lost once the
     * tab closes.
     */
    private async tryCaptureLeadFromMessage(sessionId: string, content: string): Promise<void> {
        const session = await this.chatService.getSession(sessionId);
        if (!session || session.leadCaptureStatus !== 'pending' || session.leadId) return;

        const emailMatch = content.match(ChatGateway.EMAIL_RE);
        if (!emailMatch) return;

        const phoneMatch = content.match(ChatGateway.PHONE_RE);

        const messages = await this.chatService.getMessages(sessionId);
        const projectSummary = messages
            .filter(m => m.sender === 'visitor' && m.messageType === 'text')
            .map(m => m.content)
            .join('\n');

        const lead = await this.leadsService.findOrCreateFromChat({
            name: session.visitorName || 'Visitor',
            email: emailMatch[0],
            phone: phoneMatch?.[0]?.trim(),
            projectSummary,
        });
        await this.chatService.linkLead(sessionId, lead.id);
    }

    @SubscribeMessage('admin:toggle_bot')
    async onAdminToggleBot(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sessionId: string; enabled: boolean },
    ) {
        if (!this.adminSockets.has(client.id)) return;
        await this.chatService.toggleBotEnabled(payload.sessionId, payload.enabled);
        const sessions = await this.chatService.getAllSessions();
        this.server.to('admins').emit('sessions:update', sessions);
    }

    private async tryAiAutoReply(sessionId: string, visitorMessage: string): Promise<void> {
        try {
            const session = await this.chatService.getSession(sessionId);
            if (!session?.botEnabled) return;

            const settings = await this.adminSettings.getSettings();
            if (!settings.aiEnabled || !settings.geminiApiKey) return;

            const delay = Math.max(500, settings.aiAutoReplyDelay ?? 1500);
            await new Promise(r => setTimeout(r, delay));

            // Re-check the session after the delay — it may have closed or had
            // its bot disabled while we were waiting, in which case bail out.
            const sessionAfterDelay = await this.chatService.getSession(sessionId);
            if (!sessionAfterDelay?.botEnabled || sessionAfterDelay.status === 'closed') return;

            // Get conversation history (all messages except the latest visitor message)
            const messages = await this.chatService.getMessages(sessionId);
            const history = messages.slice(0, -1)
                .filter(m => m.messageType === 'text')
                .map(m => ({
                    role: m.sender === 'visitor' ? 'user' as const : 'model' as const,
                    text: m.content,
                }));

            // If we still don't have a lead for this visitor, nudge the AI to ask
            // for an email — but only for the first couple of bot replies, then
            // give up so it doesn't nag.
            let instruction = settings.aiInstruction ?? '';
            if (sessionAfterDelay.leadCaptureStatus === 'pending' && !sessionAfterDelay.leadId) {
                const botAskCount = messages.filter(m => m.isBot).length;
                if (botAskCount >= 2) {
                    await this.chatService.setLeadCaptureStatus(sessionId, 'done');
                } else {
                    instruction = `${instruction} If the visitor hasn't shared their email address yet, naturally ask for it (and optionally a phone number) so we can follow up about their project. Ask only once and don't repeat the request if you've already asked.`.trim();
                }
            }

            const reply = await this.aiService.generateReply({
                apiKey: settings.geminiApiKey,
                tone: settings.aiTone ?? 'professional',
                instruction,
                history,
                message: visitorMessage,
                maxResponseLength: settings.aiMaxResponseLength ?? 300,
            });

            if (!reply) return;

            const aiMsg = await this.chatService.saveMessage(sessionId, reply, 'admin', 'text', undefined, true);
            this.server.to(`session:${sessionId}`).emit('message:new', aiMsg);

            const updatedSessions = await this.chatService.getAllSessions();
            this.server.to('admins').emit('sessions:update', updatedSessions);
        } catch (err) {
            console.error('[ChatGateway] AI auto-reply failed:', (err as Error)?.message ?? err);
        }
    }

    @SubscribeMessage('visitor:typing')
    onVisitorTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: TypingPayload,
    ) {
        this.server.to('admins').emit('visitor:typing', payload);
    }

    @SubscribeMessage('visitor:audio_message')
    async onVisitorAudioMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: AudioMessagePayload,
    ) {
        const sessionId = this.visitorSockets.get(client.id) ?? payload.sessionId;
        if (!sessionId) return;

        const msg = await this.chatService.saveMessage(sessionId, '[Audio Message]', 'visitor', 'audio', payload.audioUrl);

        this.server.to('admins').emit('message:new', msg);

        this.fcm.sendPush({
            title: '🎤 New Audio Message',
            body: 'Visitor sent an audio note',
            url: '/admin/dashboard',
            source: PushNotifSource.CHAT,
        });

        const sessions = await this.chatService.getAllSessions();
        this.server.to('admins').emit('sessions:update', sessions);

        return msg;
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

        // deliver to visitor and other admins watching — exclude the sending admin socket
        client.to(`session:${payload.sessionId}`).emit('message:new', msg);

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

    @SubscribeMessage('admin:audio_message')
    async onAdminAudioMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: AudioMessagePayload,
    ) {
        if (!this.adminSockets.has(client.id)) return;

        const msg = await this.chatService.saveMessage(payload.sessionId, '[Audio Message]', 'admin', 'audio', payload.audioUrl);

        // Deliver to visitor (and other admins watching this session) — exclude sender
        client.to(`session:${payload.sessionId}`).emit('message:new', msg);

        return msg;
    }

    @SubscribeMessage('admin:file_message')
    async onAdminFileMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: FileMessagePayload,
    ) {
        if (!this.adminSockets.has(client.id)) return;

        const content = payload.caption?.trim() || `[File: ${payload.fileName}]`;
        const msg = await this.chatService.saveMessage(
            payload.sessionId, content, 'admin', 'file', undefined, false,
            { fileUrl: payload.fileUrl, fileName: payload.fileName, fileType: payload.fileType, fileSize: payload.fileSize },
        );

        client.to(`session:${payload.sessionId}`).emit('message:new', msg);

        return msg;
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

    /** Called by the HTTP controller after a session is hard-deleted. */
    async emitSessionDeleted(sessionId: string): Promise<void> {
        // Tell visitor in that session room their session is gone
        this.server.to(`session:${sessionId}`).emit('session:deleted', { sessionId });
        // Update admin sessions list (deleted session will no longer appear)
        const sessions = await this.chatService.getAllSessions();
        this.server.to('admins').emit('sessions:update', sessions);
        // Tell admins explicitly so they can clear active state
        this.server.to('admins').emit('session:deleted', { sessionId });
    }
}
