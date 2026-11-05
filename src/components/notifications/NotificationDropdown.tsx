import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  Info,
  X,
  Loader2,
  ExternalLink,
  RefreshCw,
  BellOff,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { AppNotification, NotificationType } from '../../types/notification';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTransactions?: () => void;
  onNavigateToBudgets?: () => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  } catch {
    return 'Recently';
  }
}

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'budget_exceeded':
      return <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
    case 'budget_warning':
      return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    case 'transaction_activity':
      return <ArrowLeftRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    case 'monthly_summary':
      return <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    case 'system':
    default:
      return <Info className="h-4 w-4 text-slate-500 dark:text-slate-400" />;
  }
}

function getTypeBg(type: NotificationType) {
  switch (type) {
    case 'budget_exceeded':
      return 'bg-rose-50 dark:bg-rose-950/50 border-rose-100 dark:border-rose-900/50';
    case 'budget_warning':
      return 'bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-900/50';
    case 'transaction_activity':
      return 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/50';
    case 'monthly_summary':
      return 'bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900/50';
    case 'system':
    default:
      return 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700';
  }
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onNavigateToTransactions,
  onNavigateToBudgets,
}) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Always fetch fresh notifications on open
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(false);
    }
  }, [isOpen, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayedNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const handleEntityClick = (n: AppNotification) => {
    if (!n.isRead) {
      markAsRead(n._id);
    }
    if (n.relatedEntityType === 'budget' && onNavigateToBudgets) {
      onNavigateToBudgets();
      onClose();
    } else if (n.relatedEntityType === 'transaction' && onNavigateToTransactions) {
      onNavigateToTransactions();
      onClose();
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
              {unreadCount} new
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              0 unread
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fetchNotifications(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Refresh notifications"
            aria-label="Refresh notifications"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
              title="Mark all as read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close notifications"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 px-4 py-1.5 gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
            filter === 'unread'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
        {isLoading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
            <p className="mt-2 text-xs">Loading alerts...</p>
          </div>
        ) : error && notifications.length === 0 ? (
          <div className="p-6 text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-rose-500" />
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>
            <button
              type="button"
              onClick={() => fetchNotifications(false)}
              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
              <BellOff className="h-5 w-5" />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 max-w-[240px]">
              {filter === 'unread'
                ? 'All alerts have been reviewed.'
                : 'Activity logs, monthly summaries, and budget threshold warnings will appear here.'}
            </p>
          </div>
        ) : (
          displayedNotifications.map((n) => {
            const isUnread = !n.isRead;
            return (
              <div
                key={n._id}
                className={`group relative flex items-start gap-3 p-3.5 transition-colors ${
                  isUnread
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
                    : 'bg-white dark:bg-[#111827] hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Icon */}
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${getTypeBg(
                    n.type
                  )}`}
                >
                  {getTypeIcon(n.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs truncate ${
                        isUnread
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'font-medium text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {n.title}
                    </span>
                    {isUnread && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    )}
                  </div>

                  <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed break-words">
                    {n.message}
                  </p>

                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                    <span>{formatRelativeTime(n.createdAt)}</span>

                    {/* Action link */}
                    {n.relatedEntityType && (
                      <button
                        type="button"
                        onClick={() => handleEntityClick(n)}
                        className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold cursor-pointer"
                      >
                        <span>
                          {n.relatedEntityType === 'budget'
                            ? 'View Budget'
                            : n.relatedEntityType === 'transaction'
                            ? 'View Transaction'
                            : 'View Report'}
                        </span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="absolute right-2 top-2.5 flex items-center gap-0.5">
                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => markAsRead(n._id)}
                      className="rounded-md p-1 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                      title="Mark as read"
                      aria-label="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteNotification(n._id)}
                    className="rounded-md p-1 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    title="Dismiss notification"
                    aria-label="Dismiss notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status */}
      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 px-4 py-2.5 text-[11px] text-slate-500 dark:text-slate-400">
        <span>Persistent Alerts</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Real-time Financial Updates</span>
      </div>
    </div>
  );
};
