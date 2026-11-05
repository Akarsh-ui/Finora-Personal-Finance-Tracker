import React, { useState } from 'react';
import { Menu, Search, Bell, X, Sun, Moon } from 'lucide-react';
import { UserProfile } from '../../types/finance';
import { useSearch } from '../../context/SearchContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationDropdown } from '../notifications/NotificationDropdown';

interface HeaderProps {
  user: UserProfile;
  onOpenMobileMenu: () => void;
  activeTabLabel: string;
  onNavigateToTransactions?: () => void;
  onNavigateToBudgets?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenMobileMenu,
  activeTabLabel,
  onNavigateToTransactions,
  onNavigateToBudgets,
}) => {
  const { searchQuery, setSearchQuery, clearSearch } = useSearch();
  const { unreadCount, fetchNotifications } = useNotifications();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onNavigateToTransactions) {
        onNavigateToTransactions();
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#111827]/90 px-4 sm:px-6 lg:px-8 backdrop-blur-md transition-colors duration-200">
      {/* Zone 1: Mobile Hamburger & Active Page Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-xl p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 lg:hidden transition-colors cursor-pointer"
          aria-label="Open mobile navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">
            {activeTabLabel}
          </h1>
          <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
            {user.name.split(' ')[0]} · Finora Wealth Ledger
          </p>
        </div>
      </div>

      {/* Zone 2: Global Search, Notification Bell, Theme Switcher & Account Avatar */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Global Search Field */}
        <div className="relative w-36 sm:w-56 md:w-64">
          <button
            type="button"
            onClick={() => {
              if (onNavigateToTransactions) onNavigateToTransactions();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            title="Search transactions"
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search records..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-1.5 pl-8 pr-7 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Global Light / Dark Mode Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle color theme"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 scale-100" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600 transition-transform rotate-0 scale-100" />
          )}
        </button>

        {/* Real-Time Database Backed Notification Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const next = !showNotifications;
              setShowNotifications(next);
              if (next) {
                fetchNotifications();
              }
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="View notifications"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#111827] animate-in zoom-in-75">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationDropdown
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            onNavigateToTransactions={onNavigateToTransactions}
            onNavigateToBudgets={onNavigateToBudgets}
          />
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2 border-l border-slate-200/80 dark:border-slate-800 pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-800 text-xs font-bold text-white shadow-2xs">
            {user.initials}
          </div>
          <span className="hidden text-xs font-semibold text-slate-700 dark:text-slate-300 sm:inline-block">
            {user.name.split(' ')[0]}
          </span>
        </div>
      </div>
    </header>
  );
};
