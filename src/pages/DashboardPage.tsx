import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Target, RefreshCw, Plus } from 'lucide-react';
import { Transaction, TransactionInput, Budget } from '../types/finance';
import { SummaryCardsGrid } from '../components/dashboard/SummaryCardsGrid';
import { IncomeExpenseChart } from '../components/dashboard/IncomeExpenseChart';
import { ExpenseCategoryChart } from '../components/dashboard/ExpenseCategoryChart';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { BudgetOverview } from '../components/dashboard/BudgetOverview';
import { TransactionModal } from '../components/dashboard/TransactionModal';
import {
  calculateSummaryMetrics,
  calculateMonthlyCashFlow,
  calculateCategoryExpenses,
  calculateBudgetProgress,
} from '../utils/dashboardCalculations';
import { notifyTransactionsOrBudgetsChanged } from '../context/NotificationContext';

interface DashboardPageProps {
  currentTab: string;
  user?: {
    name: string;
    email: string;
  };
  onNavigateToBudgets?: () => void;
  onNavigateToTransactions?: () => void;
  onNavigateToAnalytics?: () => void;
}

const TOKEN_KEY = 'finora_session_token';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return headers;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  onNavigateToBudgets,
  onNavigateToTransactions,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Load transactions and budgets from backend APIs
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      const [txsRes, budgetsRes] = await Promise.all([
        fetch('/api/transactions', {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        }),
        fetch('/api/budgets', {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        }),
      ]);

      if (!txsRes.ok) {
        throw new Error(`Failed to load transactions (Status: ${txsRes.status})`);
      }

      const txsData = await txsRes.json();
      if (txsData.success && Array.isArray(txsData.transactions)) {
        setTransactions(txsData.transactions);
      }

      if (budgetsRes.ok) {
        const budgetsData = await budgetsRes.json();
        if (budgetsData.success && Array.isArray(budgetsData.budgets)) {
          setBudgets(budgetsData.budgets);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching dashboard data';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Create or Update Transaction handler
  const handleSaveTransaction = async (
    data: TransactionInput,
    editId?: string
  ): Promise<boolean> => {
    try {
      const url = editId ? `/api/transactions/${editId}` : '/api/transactions';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Operation failed');
      }

      await loadDashboardData();
      notifyTransactionsOrBudgetsChanged();
      return true;
    } catch (err: unknown) {
      throw err;
    }
  };

  // Delete Transaction handler
  const handleDeleteTransaction = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Delete operation failed');
      }

      await loadDashboardData();
      notifyTransactionsOrBudgetsChanged();
      return true;
    } catch (err: unknown) {
      console.error('[Transactions] Delete error:', err);
      return false;
    }
  };

  // Dynamically compute real dashboard values from active transactions & real saved budgets
  const summaryMetrics = useMemo(() => calculateSummaryMetrics(transactions), [transactions]);
  const monthlyCashFlow = useMemo(() => calculateMonthlyCashFlow(transactions), [transactions]);
  const categoryExpenses = useMemo(() => calculateCategoryExpenses(transactions), [transactions]);
  const budgetProgress = useMemo(
    () => calculateBudgetProgress(transactions, budgets),
    [transactions, budgets]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Welcome back, {user?.name || 'Partner'}. Here is your financial summary for this month.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadDashboardData()}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-emerald-500' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {onNavigateToBudgets && (
            <button
              type="button"
              onClick={onNavigateToBudgets}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <Target className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <span>Budgets</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs text-rose-800 dark:text-rose-300 font-medium">
          <span className="font-semibold">Notice: </span>
          {errorMsg}
        </div>
      )}

      {/* 1. Summary Cards Grid (4 Identical Cards: Balance, Income, Expenses, Savings) */}
      <SummaryCardsGrid metrics={summaryMetrics} />

      {/* 2. Visualizations Grid */}
      <section aria-label="Financial Trends & Breakdown" className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <IncomeExpenseChart data={monthlyCashFlow} />
        </div>
        <div className="lg:col-span-5">
          <ExpenseCategoryChart data={categoryExpenses} />
        </div>
      </section>

      {/* 3. Bottom Grid: Recent Transactions & Budget Status */}
      <section aria-label="Transactions and Budgets" className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <RecentTransactions
            transactions={transactions}
            onAddTransaction={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            onEditTransaction={(tx) => {
              setEditingTransaction(tx);
              setIsModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
            isLoading={isLoading}
            onNavigateToTransactions={onNavigateToTransactions}
          />
        </div>
        <div className="lg:col-span-5">
          <BudgetOverview
            budgets={budgetProgress}
            onNavigateToBudgets={onNavigateToBudgets}
          />
        </div>
      </section>

      {/* 4. Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleSaveTransaction}
        initialData={editingTransaction}
      />
    </div>
  );
};
