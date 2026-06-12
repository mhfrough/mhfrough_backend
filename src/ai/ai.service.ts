import { Injectable } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';

export interface AiReplyOptions {
    apiKey: string;
    tone: string;
    instruction: string;
    history: { role: 'user' | 'model'; text: string }[];
    message: string;
    maxResponseLength?: number;
}

export interface AiCollectedInfo {
    email?: string;
    phone?: string;
    budget?: string;
    website?: string;
}

export interface AiAppointmentRequest {
    title: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    durationMinutes?: number;
    notes?: string;
}

export interface AiInvoiceItemSuggestion {
    itemName: string;
    quantity?: number;
    unitPrice?: number;
}

export interface AiStructuredReply {
    reply: string;
    collected: AiCollectedInfo;
    appointment: AiAppointmentRequest | null;
    invoiceItems: AiInvoiceItemSuggestion[];
    readyToClose: boolean;
}

const TONE_MAP: Record<string, string> = {
    professional: 'Maintain a professional and courteous tone.',
    friendly: 'Be warm, friendly, and approachable.',
    casual: 'Keep it casual and conversational.',
    technical: 'Be precise and technically accurate.',
};

const STRUCTURED_RESPONSE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        reply: { type: Type.STRING, description: 'The chat reply to show the visitor.' },
        collected: {
            type: Type.OBJECT,
            properties: {
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                budget: { type: Type.STRING },
                website: { type: Type.STRING },
            },
        },
        appointment: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
                title: { type: Type.STRING },
                date: { type: Type.STRING, description: 'YYYY-MM-DD' },
                startTime: { type: Type.STRING, description: 'HH:MM 24-hour' },
                durationMinutes: { type: Type.INTEGER },
                notes: { type: Type.STRING },
            },
        },
        invoiceItems: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    itemName: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unitPrice: { type: Type.NUMBER },
                },
            },
        },
        readyToClose: { type: Type.BOOLEAN },
    },
    required: ['reply', 'readyToClose'],
};

@Injectable()
export class AiService {
    async generateReply(opts: AiReplyOptions): Promise<string | null> {
        try {
            const ai = new GoogleGenAI({ apiKey: opts.apiKey });

            const maxLen = opts.maxResponseLength ?? 300;
            const systemInstruction = [
                opts.instruction?.trim() || 'You are a helpful customer support assistant for this website.',
                TONE_MAP[opts.tone] || TONE_MAP['professional'],
                `Keep responses concise and to the point. Write in plain text without markdown. You are responding to live chat messages from website visitors. Keep your reply under ${maxLen} characters.`,
            ].join(' ');

            const contents = [
                ...opts.history.map(h => ({
                    role: h.role,
                    parts: [{ text: h.text }],
                })),
                { role: 'user' as const, parts: [{ text: opts.message }] },
            ];

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-lite',
                contents,
                config: { systemInstruction },
            });

            return response.text?.trim() ?? null;
        } catch (err) {
            console.error('[AiService] generateReply error:', (err as Error)?.message ?? err);
            return null;
        }
    }

    /**
     * Like generateReply, but asks Gemini to also return structured data
     * (collected lead info, an appointment request, suggested invoice items,
     * and whether the conversation is ready to wrap up) alongside the reply text.
     */
    async generateStructuredReply(opts: AiReplyOptions & { task: string }): Promise<AiStructuredReply | null> {
        try {
            const ai = new GoogleGenAI({ apiKey: opts.apiKey });

            const maxLen = opts.maxResponseLength ?? 300;
            const systemInstruction = [
                opts.instruction?.trim() || 'You are a helpful customer support assistant for this website.',
                TONE_MAP[opts.tone] || TONE_MAP['professional'],
                `Keep the "reply" field concise, in plain text without markdown, under ${maxLen} characters. You are responding to live chat messages from website visitors.`,
                opts.task,
            ].join(' ');

            const contents = [
                ...opts.history.map(h => ({
                    role: h.role,
                    parts: [{ text: h.text }],
                })),
                { role: 'user' as const, parts: [{ text: opts.message }] },
            ];

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-lite',
                contents,
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: STRUCTURED_RESPONSE_SCHEMA,
                },
            });

            const text = response.text?.trim();
            if (!text) return null;

            try {
                const parsed = JSON.parse(text);
                return {
                    reply: typeof parsed.reply === 'string' ? parsed.reply : '',
                    collected: parsed.collected ?? {},
                    appointment: parsed.appointment ?? null,
                    invoiceItems: Array.isArray(parsed.invoiceItems) ? parsed.invoiceItems : [],
                    readyToClose: !!parsed.readyToClose,
                };
            } catch {
                return { reply: text, collected: {}, appointment: null, invoiceItems: [], readyToClose: false };
            }
        } catch (err) {
            console.error('[AiService] generateStructuredReply error:', (err as Error)?.message ?? err);
            return null;
        }
    }
}
