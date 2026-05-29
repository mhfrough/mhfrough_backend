import {
    ExceptionFilter, Catch, ArgumentsHost,
    HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ActivityLogService } from '../../activity-log/activity-log.service';

/** HTTP status codes that are worth persisting in the activity log. */
const LOGGABLE_STATUSES = new Set([400, 401, 403, 405, 422, 429, 500, 502, 503, 504]);

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    constructor(private readonly activityLog: ActivityLogService) { }

    catch(exception: unknown, host: ArgumentsHost): void {
        // Only handle HTTP context (skip WebSocket / RPC)
        if (host.getType() !== 'http') return;

        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const rawMessage =
            exception instanceof HttpException
                ? exception.getResponse()
                : exception instanceof Error
                    ? exception.message
                    : String(exception);

        const message =
            typeof rawMessage === 'string'
                ? rawMessage
                : (rawMessage as { message?: unknown })?.message
                    ? String((rawMessage as { message?: unknown }).message)
                    : JSON.stringify(rawMessage);

        const stack = exception instanceof Error ? exception.stack : undefined;

        // Log to activity log — but skip the activity-log endpoint itself to prevent loops
        const path: string = request.path ?? '';
        if (!path.includes('/activity-logs') && LOGGABLE_STATUSES.has(status)) {
            const action =
                status >= 500 ? 'error:server'
                    : status === 401 ? 'error:unauthorized'
                        : status === 403 ? 'error:forbidden'
                            : 'error:api';

            this.activityLog.log({
                action,
                resource: 'server',
                description: `${request.method} ${path} → ${status}: ${message.slice(0, 300)}`,
                status: 'error',
                // Only include stack trace for server errors — not for client mistakes
                errorMessage: status >= 500 ? stack?.slice(0, 5000) : undefined,
                metadata: {
                    method: request.method,
                    path,
                    statusCode: status,
                    userAgent: request.get('user-agent'),
                },
            });
        }

        // Log server errors to console as well
        if (status >= 500) {
            this.logger.error(`${request.method} ${path} → ${status}`, stack);
        }

        // Never expose internal error details to the client for 5xx
        const clientMessage = status >= 500 ? 'Internal server error' : message;

        response.status(status).json({
            statusCode: status,
            message: clientMessage,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
