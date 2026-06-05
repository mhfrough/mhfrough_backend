import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

export interface AiReplyOptions {
    apiKey: string;
    tone: string;
    instruction: string;
    history: { role: 'user' | 'model'; text: string }[];
    message: string;
    maxResponseLength?: number;
}

const TONE_MAP: Record<string, string> = {
    professional: 'Maintain a professional and courteous tone.',
    friendly: 'Be warm, friendly, and approachable.',
    casual: 'Keep it casual and conversational.',
    technical: 'Be precise and technically accurate.',
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
                model: 'gemini-2.0-flash',
                contents,
                config: { systemInstruction },
            });

            return response.text?.trim() ?? null;
        } catch (err) {
            console.error('[AiService] generateReply error:', (err as Error)?.message ?? err);
            return null;
        }
    }
}
