import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppNotification, NotificationResponse } from '../types/notification';
import { useAuth } from './AuthContext';

export interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: (silent?: boolean, unreadOnly?: boolean) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (id: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const TOKEN_KEY = 'finora_session_token';

/**
 * Global trigger to notify that transactions or budgets have changed
 * and notifications should immediately refresh.
 */
export function notifyTransactionsOrBudgetsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finora:refresh-notifications'));
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch {
    // ignore
  }
  return headers;
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications and unread count simultaneously from /api/notifications
  const fetchNotifications = useCallback(
    async (silent = false, unreadOnly = false) => {
      if (!user) return;
      try {
        if (!silent) {
          setIsLoading(true);
        }
        setError(null);
        const query = unreadOnly ? '?unreadOnly=true' : '';
        const res = await fetch(`/api/notifications${query}`, {
          headers: getAuthHeaders(),
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Failed to load notifications.');
        }

        const data: NotificationResponse = await res.json();
        if (data.success) {
          setNotifications(data.notifications || []);
          setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error loading notifications.';
        setError(msg);
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [user]
  );

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications(false);
  }, [fetchNotifications]);

  // Initial fetch and 12-second periodic poll while user is logged in
  useEffect(() => {
    if (user) {
      fetchNotifications(false);
      const interval = setInterval(() => {
        fetchNotifications(true);
      }, 12000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  // Listen for local transaction or budget change events to refresh immediately
  useEffect(() => {
    const handleEvent = () => {
      // Small timeout to allow backend asynchronous notification hooks to commit
      setTimeout(() => {
        fetchNotifications(true);
      }, 150);
    };

    window.addEventListener('finora:refresh-notifications', handleEvent);
    return () => {
      window.removeEventListener('finora:refresh-notifications', handleEvent);
    };
  }, [fetchNotifications]);

  // Mark single as read
  const markAsRead = async (id: string): Promise<boolean> => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        fetchNotifications(true);
        return false;
      }
      return true;
    } catch {
      fetchNotifications(true);
      return false;
    }
  };

  // Mark all as read
  const markAllAsRead = async (): Promise<boolean> => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        fetchNotifications(true);
        return false;
      }
      return true;
    } catch {
      fetchNotifications(true);
      return false;
    }
  };

  // Delete / dismiss notification
  const deleteNotification = async (id: string): Promise<boolean> => {
    try {
      // Optimistic delete
      const target = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (target && !target.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        fetchNotifications(true);
        return false;
      }
      return true;
    } catch {
      fetchNotifications(true);
      return false;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        error,
        fetchNotifications,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
