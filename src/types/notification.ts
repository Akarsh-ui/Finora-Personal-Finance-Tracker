export type NotificationType =
  | 'budget_warning'
  | 'budget_exceeded'
  | 'transaction_activity'
  | 'monthly_summary'
  | 'system';

export interface AppNotification {
  _id: string;
  id?: string;
  user?: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  relatedEntityId?: string | null;
  relatedEntityType?: 'transaction' | 'budget' | 'report' | null;
  deduplicationKey?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationResponse {
  success: boolean;
  count: number;
  total: number;
  unreadCount: number;
  page: number;
  totalPages: number;
  notifications: AppNotification[];
}
