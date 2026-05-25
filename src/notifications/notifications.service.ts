import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export type NotificationEventType =
    | 'new_inquiry'
    | 'new_feedback'
    | 'new_comment'
    | 'feedback_updated'
    | 'comment_updated'
    | 'inquiry_updated';

export interface AdminStreamEvent {
    type: NotificationEventType;
}

@Injectable()
export class NotificationsService {
    private readonly stream$ = new Subject<AdminStreamEvent>();

    emit(type: NotificationEventType): void {
        this.stream$.next({ type });
    }

    getStream() {
        return this.stream$.asObservable();
    }
}
