/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthPage } from './components/auth/AuthPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { SearchProvider } from './context/SearchContext';
import { NotificationProvider } from './context/NotificationContext';
import { TrendingUp, Loader2 } from 'lucide-react';
import { UserProfile } from './types/finance';

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function MainDashboard() {
  const { user, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'overview':
        return 'Overview';
      case 'ai-assistant':
        return 'Finora AI Assistant';
      case 'transactions':
        return 'Transactions';
      case 'budgets':
        return 'Budgets';
      case 'analytics':
        return 'Analytics & Intelligence';
      case 'settings':
        return 'System & Profile Settings';
      default:
        return 'Overview';
    }
  };

  // Convert authenticated AuthUser to UserProfile for layout components
  const userProfile: UserProfile = {
    name: user?.name || 'Finora User',
    email: user?.email || '',
    role: 'Personal Wealth Account',
    initials: getInitials(user?.name || 'User'),
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        user={userProfile}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
        {/* Top Header */}
        <Header
          user={userProfile}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          activeTabLabel={getTabLabel(currentTab)}
          onNavigateToTransactions={() => setCurrentTab('transactions')}
          onNavigateToBudgets={() => setCurrentTab('budgets')}
        />

        {/* Dashboard / Budgets / Transactions / Analytics / Settings / AI Assistant Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'ai-assistant' ? (
            <AiAssistantPage user={{ name: userProfile.name, email: userProfile.email }} />
          ) : currentTab === 'budgets' ? (
            <BudgetsPage user={{ name: userProfile.name, email: userProfile.email }} />
          ) : currentTab === 'transactions' ? (
            <TransactionsPage user={{ name: userProfile.name, email: userProfile.email }} />
          ) : currentTab === 'analytics' ? (
            <AnalyticsPage
              user={{ name: userProfile.name, email: userProfile.email }}
              onNavigateToTransactions={() => setCurrentTab('transactions')}
            />
          ) : currentTab === 'settings' ? (
            <SettingsPage onLogout={logout} />
          ) : (
            <DashboardPage
              currentTab={currentTab}
              user={{ name: userProfile.name, email: userProfile.email }}
              onNavigateToBudgets={() => setCurrentTab('budgets')}
              onNavigateToTransactions={() => setCurrentTab('transactions')}
              onNavigateToAnalytics={() => setCurrentTab('analytics')}
            />
          )}
        </main>

        {/* Professional Minimalist Footer */}
        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#111827]/70 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              &copy; {new Date().getFullYear()} Finora Personal Finance Intelligence.
            </span>
            <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-[11px]">
              <span>MongoDB Atlas Encrypted</span>
              <span aria-hidden="true">·</span>
              <span>{user?.currency || 'INR'} Standard</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  // Loading spinner while checking /api/auth/me
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-[#0B0F19]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20">
          <TrendingUp className="h-6 w-6 animate-pulse" />
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span>Restoring authenticated session...</span>
        </div>
      </div>
    );
  }

  // If unauthenticated, redirect to Login/Register Auth Page
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // If authenticated, render protected Dashboard
  return <MainDashboard />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <SearchProvider>
            <AppContent />
          </SearchProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
