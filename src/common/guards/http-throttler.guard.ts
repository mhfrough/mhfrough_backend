import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * ThrottlerGuard scoped to HTTP only.
 *
 * Registered globally via APP_GUARD it would otherwise also fire on WebSocket
 * (and any RPC) handlers, where it tries to read an HTTP request/response that
 * doesn't exist and throws — which would break the chat/events gateways.
 * Skipping non-HTTP contexts keeps rate limiting on the REST API while leaving
 * realtime sockets untouched.
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    return super.canActivate(context);
  }
}
