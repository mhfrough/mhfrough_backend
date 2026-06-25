import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

/**
 * Pulls the admin JWT out of a Socket.IO handshake. The browser sends the
 * httpOnly `access_token` cookie on the upgrade request when the client is
 * created with `withCredentials: true`; we also accept an explicit
 * `auth.token` / `Authorization` header as a fallback for non-browser clients.
 */
export function extractTokenFromSocket(client: Socket): string | null {
    const cookieHeader = client.handshake?.headers?.cookie;
    if (cookieHeader) {
        for (const part of cookieHeader.split(';')) {
            const eq = part.indexOf('=');
            if (eq === -1) continue;
            const name = part.slice(0, eq).trim();
            if (name === 'access_token') {
                return decodeURIComponent(part.slice(eq + 1).trim());
            }
        }
    }

    const authToken = (client.handshake?.auth as { token?: unknown } | undefined)?.token;
    if (typeof authToken === 'string' && authToken) {
        return authToken.replace(/^Bearer\s+/i, '');
    }

    const authHeader = client.handshake?.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader) {
        return authHeader.replace(/^Bearer\s+/i, '');
    }

    return null;
}

/**
 * Verifies that a socket is driven by an authenticated admin. Returns the
 * decoded payload on success or `null` on any failure (missing/invalid/expired
 * token, or non-admin role). Never throws — callers gate on the boolean result.
 */
export async function verifyAdminSocket(
    client: Socket,
    jwt: JwtService,
): Promise<{ sub: string; email: string; role: string } | null> {
    const token = extractTokenFromSocket(client);
    if (!token) return null;
    try {
        const payload = await jwt.verifyAsync<{ sub: string; email: string; role: string }>(token);
        return payload?.role === 'admin' ? payload : null;
    } catch {
        return null;
    }
}
