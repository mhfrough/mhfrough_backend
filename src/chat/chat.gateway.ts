import {
    WebSocketGateway, WebSocketServer, SubscribeMessage,
    OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { verifyAdminSocket } from '../common/ws-admin-auth';
import { ChatService } from './chat.service';
import { FcmService } from '../fcm/fcm.service';
import { PushNotifSource } from '../fcm/push-notification-log.entity';
import { AiService } from '../ai/ai.service';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';
import { LeadsService } from '../leads/leads.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { InvoicesService } from '../invoices/invoices.service';
import { WidgetsService } from '../widgets/widgets.service';
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
    /** Matches an AI-suggested appointment date (YYYY-MM-DD) */
    private static readonly DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    /** Matches an AI-suggested appointment start time (24-hour HH:MM) */
    private static readonly TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
    /** Matches a PKR-denominated budget (Rs, PKR, rupees, ₨) */
    private static readonly PKR_RE = /\b(?:pkr|rs\.?|rupees?|₨)\b/i;
    /** Extracts a numeric amount with an optional k/lac/lakh/crore/million suffix */
    private static readonly AMOUNT_RE = /([\d,]+(?:\.\d+)?)\s*(k|thousand|lac|lakh|crore|m|million)?/i;
    /** Hard cap on a single chat message — guards against unbounded payloads */
    private static readonly MAX_CONTENT = 4000;

    /**
     * Trims an inbound message, rejects non-strings/empties, and caps length so
     * a malicious or buggy client can't push unbounded content into the DB.
     * Returns null when the message should be ignored.
     */
    private sanitizeContent(raw: unknown): string | null {
        if (typeof raw !== 'string') return null;
        const trimmed = raw.trim();
        if (!trimmed) return null;
        return trimmed.slice(0, ChatGateway.MAX_CONTENT);
    }

    constructor(
        private readonly chatService: ChatService,
        private readonly fcm: FcmService,
        private readonly aiService: AiService,
        private readonly adminSettings: AdminSettingsService,
        private readonly leadsService: LeadsService,
        private readonly appointmentsService: AppointmentsService,
        private readonly invoicesService: InvoicesService,
        private readonly widgetsService: WidgetsService,
        private readonly jwt: JwtService,
    ) { }

    /**
     * If `raw` is a PKR-denominated budget and a cached USD/PKR rate is
     * available, appends a rough USD equivalent — e.g. "PKR 2,500,000" ->
     * "PKR 2,500,000 (~$8,929 USD)". Returns `raw` unchanged otherwise.
     */
    private normalizeBudgetToUsd(raw: string, usdPkrRate: number | null): string {
        if (!usdPkrRate || !ChatGateway.PKR_RE.test(raw)) return raw;

        const match = raw.match(ChatGateway.AMOUNT_RE);
        if (!match) return raw;

        let amount = parseFloat(match[1].replace(/,/g, ''));
        if (isNaN(amount)) return raw;

        switch (match[2]?.toLowerCase()) {
            case 'k': case 'thousand': amount *= 1_000; break;
            case 'lac': case 'lakh': amount *= 100_000; break;
            case 'crore': amount *= 10_000_000; break;
            case 'm': case 'million': amount *= 1_000_000; break;
        }

        const usd = Math.round(amount / usdPkrRate);
        return `${raw} (~$${usd.toLocaleString('en-US')} USD)`;
    }

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

        const content = this.sanitizeContent(payload.content);
        if (!content) return;

        const msg = await this.chatService.saveMessage(sessionId, content, 'visitor');

        // broadcast to admins
        this.server.to('admins').emit('message:new', msg);

        // push notification for new visitor message
        this.fcm.sendPush({
            title: '💬 New Chat Message',
            body: `Visitor: "${content.slice(0, 80)}"`,
            url: '/admin/dashboard',
            source: PushNotifSource.CHAT,
        });

        // If we don't have a lead for this visitor yet, see if they just shared their contact info
        await this.tryCaptureLeadFromMessage(sessionId, content);

        // update sessions list for admins
        const sessions = await this.chatService.getAllSessions();
        this.server.to('admins').emit('sessions:update', sessions);

        // Fire-and-forget AI auto-reply
        this.tryAiAutoReply(sessionId, content);

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

            // Resolve the lead linked to this session (if any) so we know what's
            // already known and can merge newly-collected info onto it.
            let lead = sessionAfterDelay.leadId
                ? await this.leadsService.findOne(sessionAfterDelay.leadId).catch(() => null)
                : null;

            // Order here is the priority in which the AI should ask for missing
            // info — contact details first, then the project itself, with the
            // visitor's existing website/business URL last (least essential).
            const FIELD_LABELS: Record<'email' | 'phone' | 'budget' | 'website', string> = {
                email: 'email address',
                phone: 'phone number',
                budget: 'project budget and basic requirements',
                website: 'current website / business URL (if relevant)',
            };
            const missingFields = (Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[])
                .filter(f => !lead?.[f]);

            const questionsAsked = messages.filter(m => m.isBot && m.messageType === 'text').length;
            const maxQuestions = settings.aiMaxQuestions ?? 12;
            const remaining = maxQuestions - questionsAsked;

            const now = new Date();
            const todayStr = now.toISOString().slice(0, 10);
            const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });

            const taskParts: string[] = [];
            if (missingFields.length > 0 && remaining > 1) {
                const labels = missingFields.map(f => FIELD_LABELS[f]).join(', then their ');
                taskParts.push(
                    `You are also qualifying this visitor as a lead. In this priority order, you still need to find out the visitor's ${labels}. ` +
                    `Ask about ONE of these per reply, woven naturally into the conversation — don't list them all at once, and don't skip ahead in the order unless the visitor already volunteered a later item. ` +
                    `Try to gather what you need efficiently: as soon as you have their contact info plus a basic idea of their needs/budget, that's usually enough to move forward — don't keep asking questions just to use up your reply budget. ` +
                    `You have about ${remaining} more replies before this conversation must wrap up. ` +
                    `Once you've asked about everything missing (or you have enough to move forward, or you're nearly out of replies) and the visitor has confirmed their details, set readyToClose=true.`,
                );
            } else {
                taskParts.push(
                    `You have already gathered everything needed from this visitor, or you've reached the question limit. Set readyToClose=true.`,
                );
            }
            taskParts.push(
                `When readyToClose is true, write a brief reply that responds naturally to what the visitor just said — do not say goodbye or wrap up the conversation, since a separate closing message will be sent automatically right after yours.`,
            );
            taskParts.push(
                `Always populate "collected" with any of email, phone, budget, or website the visitor has shared so far in this message — only include fields they actually provided.`,
            );
            taskParts.push(
                `If you ask about budget (or the visitor brings it up), also ask them to specify whether the amount is in USD or PKR.`,
            );
            taskParts.push(
                `Today is ${weekday}, ${todayStr}. Once you have the visitor's contact details and a basic idea of their project, proactively offer to set up a quick call or chat to discuss further, and ask if they have a day/time that works for them. ` +
                `If the visitor agrees to or requests a specific date/time for a call, meeting, or appointment, ` +
                `fill the "appointment" field with a short title, the date (YYYY-MM-DD), startTime (24-hour HH:MM), and durationMinutes (default 30). ` +
                `Otherwise leave "appointment" null.`,
            );
            taskParts.push(
                `When readyToClose is true, also suggest 1-3 "invoiceItems" (itemName, quantity, unitPrice) for a draft project invoice based on what was discussed and any budget mentioned. Otherwise leave "invoiceItems" empty.`,
            );

            const aiResult = await this.aiService.generateStructuredReply({
                apiKey: settings.geminiApiKey,
                tone: settings.aiTone ?? 'professional',
                instruction: settings.aiInstruction ?? '',
                history,
                message: visitorMessage,
                maxResponseLength: settings.aiMaxResponseLength ?? 300,
                task: taskParts.join(' '),
            });

            if (!aiResult?.reply) return;

            const aiMsg = await this.chatService.saveMessage(sessionId, aiResult.reply, 'admin', 'text', undefined, true);
            this.server.to(`session:${sessionId}`).emit('message:new', aiMsg);

            // Merge newly-collected lead info
            const collected = aiResult.collected ?? {};
            const collectedEmail = collected.email?.trim();
            if (!lead && collectedEmail && ChatGateway.EMAIL_RE.test(collectedEmail)) {
                lead = await this.leadsService.findOrCreateFromChat({
                    name: sessionAfterDelay.visitorName || 'Visitor',
                    email: collectedEmail,
                    phone: collected.phone?.trim(),
                });
                await this.chatService.linkLead(sessionId, lead.id);
            }
            if (lead) {
                const collectedBudget = collected.budget?.trim();
                const budget = collectedBudget
                    ? this.normalizeBudgetToUsd(collectedBudget, await this.widgetsService.getUsdPkrRate())
                    : undefined;
                lead = await this.leadsService.mergeCapturedInfo(lead.id, {
                    phone: collected.phone?.trim(),
                    website: collected.website?.trim(),
                    budget,
                });
            }

            // Appointment / reminder card
            const appt = aiResult.appointment;
            if (appt?.title?.trim() && appt.date && ChatGateway.DATE_RE.test(appt.date) && appt.startTime && ChatGateway.TIME_RE.test(appt.startTime)) {
                const durationMinutes = Math.min(480, Math.max(15, Math.round(appt.durationMinutes ?? 30)));
                const saved = await this.appointmentsService.create({
                    title: appt.title.trim(),
                    clientName: sessionAfterDelay.visitorName || undefined,
                    clientEmail: lead?.email,
                    clientPhone: lead?.phone ?? undefined,
                    date: appt.date,
                    startTime: appt.startTime,
                    durationMinutes,
                    notes: appt.notes,
                    status: 'pending',
                    leadId: lead?.id,
                });
                const reminderMsg = await this.chatService.saveMessage(
                    sessionId,
                    JSON.stringify({
                        appointmentId: saved.id,
                        title: saved.title,
                        date: saved.date,
                        startTime: saved.startTime,
                        durationMinutes: saved.durationMinutes,
                    }),
                    'admin',
                    'reminder',
                    undefined,
                    true,
                );
                this.server.to(`session:${sessionId}`).emit('message:new', reminderMsg);
            }

            // Wrap-up: stop the bot, draft an invoice, and post a closer message
            const finalize = aiResult.readyToClose || remaining <= 1;
            if (finalize) {
                await this.chatService.setLeadCaptureStatus(sessionId, 'done');
                await this.chatService.toggleBotEnabled(sessionId, false);

                if (lead?.email) {
                    const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                    const items = (aiResult.invoiceItems ?? [])
                        .filter(it => it.itemName?.trim())
                        .slice(0, 5)
                        .map(it => ({
                            itemName: it.itemName.trim(),
                            quantity: it.quantity && it.quantity > 0 ? it.quantity : 1,
                            unitPrice: it.unitPrice && it.unitPrice >= 0 ? it.unitPrice : 0,
                        }));
                    await this.invoicesService.create({
                        clientName: sessionAfterDelay.visitorName || lead.name,
                        clientEmail: lead.email,
                        clientAddress: lead.website ?? '',
                        clientPhone: lead.phone ?? undefined,
                        issueDate: todayStr,
                        dueDate,
                        items: items.length ? items : [{ itemName: 'Project Discussion / Consultation', quantity: 1, unitPrice: 0 }],
                        status: 'draft',
                        leadId: lead.id,
                    });
                }

                const chatSettings = await this.chatService.getSettings();
                const finalMessages = Array.isArray(chatSettings.final_messages) ? chatSettings.final_messages as string[] : [];
                const finalMessage = finalMessages.length
                    ? finalMessages[Math.floor(Math.random() * finalMessages.length)]
                    : "Thanks — that's everything we need! We'll review your details and get back to you shortly.";

                // Brief pause so the closing message doesn't land instantly after the reply above
                await new Promise(r => setTimeout(r, 2000));

                const finalMsg = await this.chatService.saveMessage(sessionId, finalMessage, 'admin', 'text', undefined, true);
                this.server.to(`session:${sessionId}`).emit('message:new', finalMsg);
            }

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
        // Authenticate the socket before granting any admin privileges. Without
        // this, any anonymous client could emit `admin:join` and then read every
        // visitor's chat history/PII and post messages as the admin.
        const admin = await verifyAdminSocket(client, this.jwt);
        if (!admin) {
            client.emit('admin:unauthorized');
            return [];
        }
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
        if (!this.adminSockets.has(client.id)) return [];
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

        const content = this.sanitizeContent(payload.content);
        if (!content) return;

        const msg = await this.chatService.saveMessage(payload.sessionId, content, 'admin');

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
