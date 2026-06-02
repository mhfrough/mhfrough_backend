import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from './chat-session.entity';
import { ChatMessage } from './chat-message.entity';
import { ChatSetting } from './chat-setting.entity';

const DEFAULT_GREETINGS = [
    'Hi there! 👋 How can I help you today?',
    'Hello! Feel free to ask me anything.',
    'Welcome! I\'m here to help.',
];

const DEFAULT_HOLD_MESSAGES = [
    'Thanks for reaching out! We\'ll get back to you shortly.',
    'Hello! We have received your message and will respond soon.',
    'Hi! Please hold on, we\'ll be with you in a moment.',
];

const DEFAULT_STATUS_MESSAGE = 'Typically replies within a few minutes';

@Injectable()
export class ChatService implements OnModuleInit {
    constructor(
        @InjectRepository(ChatSession)
        private readonly sessions: Repository<ChatSession>,
        @InjectRepository(ChatMessage)
        private readonly messages: Repository<ChatMessage>,
        @InjectRepository(ChatSetting)
        private readonly settings: Repository<ChatSetting>,
    ) { }

    async onModuleInit() {
        try {
            await this.seedSettings();
        } catch (err) {
            console.error('[ChatService] seedSettings failed:', (err as Error)?.message ?? err);
        }
    }

    private async seedSettings() {
        const defaults: Record<string, string> = {
            greeting_messages: JSON.stringify(DEFAULT_GREETINGS),
            hold_messages: JSON.stringify(DEFAULT_HOLD_MESSAGES),
            status_message: DEFAULT_STATUS_MESSAGE,
        };
        for (const [key, value] of Object.entries(defaults)) {
            const existing = await this.settings.findOne({ where: { key } });
            if (!existing) {
                await this.settings.save(this.settings.create({ key, value }));
            }
        }
    }

    // ─── Settings ─────────────────────────────────────────────────────────────

    async getSettings(): Promise<Record<string, unknown>> {
        const rows = await this.settings.find();
        const result: Record<string, unknown> = {};
        for (const row of rows) {
            try {
                result[row.key] = JSON.parse(row.value);
            } catch {
                result[row.key] = row.value;
            }
        }
        return result;
    }

    async updateSettings(key: string, value: unknown): Promise<void> {
        const existing = await this.settings.findOne({ where: { key } });
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        if (existing) {
            existing.value = serialized;
            await this.settings.save(existing);
        } else {
            await this.settings.save(this.settings.create({ key, value: serialized }));
        }
    }

    // ─── Sessions ─────────────────────────────────────────────────────────────

    async createSession(visitorName?: string): Promise<ChatSession> {
        const session = this.sessions.create({ visitorName: visitorName ?? 'Visitor', status: 'active' });
        return this.sessions.save(session);
    }

    async getSession(id: string): Promise<ChatSession | null> {
        return this.sessions.findOne({ where: { id } });
    }

    async getAllSessions(): Promise<(ChatSession & { unreadCount: number })[]> {
        const rows = await this.sessions.find({ order: { lastActivityAt: 'DESC' } });
        const result = await Promise.all(rows.map(async (s) => {
            const unreadCount = await this.messages.count({ where: { sessionId: s.id, sender: 'visitor', read: false } });
            return Object.assign(s, { unreadCount });
        }));
        return result;
    }

    async closeSession(id: string): Promise<void> {
        await this.sessions.update(id, { status: 'closed' });
    }

    async deleteSession(id: string): Promise<void> {
        await this.sessions.delete(id);
    }

    async touchSession(id: string): Promise<void> {
        await this.sessions.update(id, { lastActivityAt: new Date() });
    }

    // ─── Messages ─────────────────────────────────────────────────────────────

    async saveMessage(
        sessionId: string,
        content: string,
        sender: 'visitor' | 'admin',
        messageType: 'text' | 'audio' = 'text',
        audioUrl?: string,
    ): Promise<ChatMessage> {
        const msg = this.messages.create({ sessionId, content, sender, messageType, audioUrl: audioUrl ?? null });
        const saved = await this.messages.save(msg);
        await this.sessions.update(sessionId, { lastActivityAt: new Date() });
        return saved;
    }

    async getMessages(sessionId: string): Promise<ChatMessage[]> {
        return this.messages.find({ where: { sessionId }, order: { createdAt: 'ASC' } });
    }

    async markSessionRead(sessionId: string): Promise<void> {
        await this.messages.update({ sessionId, sender: 'visitor', read: false }, { read: true });
    }

    async getUnreadCount(): Promise<number> {
        return this.messages.count({ where: { sender: 'visitor', read: false } });
    }
}
