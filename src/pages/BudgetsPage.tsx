import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  PieChart,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Wallet,
  ArrowRight,
  Loader2,
  ShoppingCart,
  Home,
  Laptop,
  Train,
  Tag,
  Zap,
  Utensils,
  HeartPulse,
  GraduationCap,
  Sparkles,
  CreditCard,
  Briefcase,
} from 'lucide-react';
import { Budget, BudgetInput, Transaction } from '../types/finance';
import { BudgetModal } from '../components/budgets/BudgetModal';
import { formatINR } from '../utils/formatters';
import { calculateUnbudgetedExpenses } from '../utils/dashboardCalculations';
import { notifyTransactionsOrBudgetsChanged } from '../context/NotificationContext';

interface BudgetsPageProps {
  user?: {
    name: string;
    email: string;
  };
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const TOKEN_KEY = 'finora_session_token';

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

export const BudgetsPage: React.FC<BudgetsPageProps> = () => {
  const now = new Date();
  const currentActualMonth = now.getMonth() + 1; // 1-indexed
  const currentActualYear = now.getFullYear();

  // Period Selection State
  const [selectedMonth, setSelectedMonth] = useState<number>(currentActualMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentActualYear);

  // Data states
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal & Delete confirmation states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isCurrentMonthView =
    selectedMonth === currentActualMonth && selectedYear === currentActualYear;

  // Category Icon Resolver
  const getCategoryIcon = (category: string) => {
    const iconClass = 'h-5 w-5';
    switch (category.toLowerCase()) {
      case 'housing & rent':
      case 'rent':
        return <Home className={iconClass} />;
      case 'food & groceries':
      case 'groceries':
        return <ShoppingCart className={iconClass} />;
      case 'food & dining':
        return <Utensils className={iconClass} />;
      case 'shopping':
      case 'shopping & lifestyle':
        return <Tag className={iconClass} />;
      case 'utilities':
      case 'utilities & bills':
        return <Zap className={iconClass} />;
      case 'transportation':
        return <Train className={iconClass} />;
      case 'healthcare':
        return <HeartPulse className={iconClass} />;
      case 'education':
        return <GraduationCap className={iconClass} />;
      case 'personal care':
        return <Sparkles className={iconClass} />;
      case 'freelance':
        return <Laptop className={iconClass} />;
      case 'salary':
        return <Briefcase className={iconClass} />;
      default:
        return <CreditCard className={iconClass} />;
    }
  };

  // Fetch both budgets and transactions
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      const [budgetsRes, txsRes] = await Promise.all([
        fetch(`/api/budgets?month=${selectedMonth}&year=${selectedYear}`, {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        }),
        fetch('/api/transactions', {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        }),
      ]);

      if (!budgetsRes.ok) {
        throw new Error(`Failed to load budgets (HTTP ${budgetsRes.status})`);
      }
      if (!txsRes.ok) {
        throw new Error(`Failed to load transactions (HTTP ${txsRes.status})`);
      }

      const budgetsData = await budgetsRes.json();
      const txsData = await txsRes.json();

      if (budgetsData.success && Array.isArray(budgetsData.budgets)) {
        setBudgets(budgetsData.budgets);
      }
      if (txsData.success && Array.isArray(txsData.transactions)) {
        setTransactions(txsData.transactions);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading budget data.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigate months
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(currentActualMonth);
    setSelectedYear(currentActualYear);
  };

  // Add / Edit Budget Handler
  const handleSaveBudget = async (data: BudgetInput, editId?: string): Promise<boolean> => {
    try {
      const url = editId ? `/api/budgets/${editId}` : '/api/budgets';
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

      setSuccessMsg(
        editId
          ? `Budget for ${data.category} updated.`
          : `Budget for ${data.category} established for ${MONTH_NAMES[data.month - 1]} ${data.year}.`
      );
      setTimeout(() => setSuccessMsg(null), 4000);

      await loadData();
      notifyTransactionsOrBudgetsChanged();
      return true;
    } catch (err: unknown) {
      throw err;
    }
  };

  // Delete Budget Handler
  const handleDeleteBudget = async (id: string): Promise<void> => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/budgets/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete budget');
      }

      setSuccessMsg('Budget removed.');
      setTimeout(() => setSuccessMsg(null), 4000);
      setDeleteConfirmId(null);
      await loadData();
      notifyTransactionsOrBudgetsChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting budget.';
      setErrorMsg(msg);
    } finally {
      setDeletingId(null);
    }
  };

  // Calculations for Selected Month
  const budgetProgressItems = useMemo(() => {
    const spentMap: Record<string, number> = {};

    for (const tx of transactions) {
      if (tx.type === 'expense') {
        const txDate = new Date(tx.date);
        const txMonth = txDate.getMonth() + 1;
        const txYear = txDate.getFullYear();

        if (txMonth === selectedMonth && txYear === selectedYear) {
          const cat = (tx.category || '').trim();
          spentMap[cat] = (spentMap[cat] || 0) + (Number(tx.amount) || 0);
        }
      }
    }

    return budgets.map((b) => {
      const cat = b.category.trim();
      let spent = spentMap[cat] || 0;

      if (cat === 'Food & Groceries') {
        spent += (spentMap['Groceries'] || 0) + (spentMap['Food & Dining'] || 0);
      } else if (cat === 'Housing & Rent') {
        spent += spentMap['Rent'] || 0;
      } else if (cat === 'Utilities') {
        spent += spentMap['Utilities & Bills'] || 0;
      } else if (cat === 'Shopping') {
        spent += spentMap['Shopping & Lifestyle'] || 0;
      }

      const allocated = b.monthlyLimit;
      const rawPct = allocated > 0 ? (spent / allocated) * 100 : 0;
      const percentage = Math.round(rawPct);
      const remaining = Math.max(0, allocated - spent);
      const isOver = spent > allocated;
      const isNear = percentage >= 80 && !isOver;

      return {
        budget: b,
        spent,
        allocated,
        remaining,
        percentage,
        rawPct,
        isOver,
        isNear,
      };
    });
  }, [budgets, transactions, selectedMonth, selectedYear]);

  // Overall Summaries
  const totalMonthlyBudget = useMemo(
    () => budgets.reduce((sum, b) => sum + (Number(b.monthlyLimit) || 0), 0),
    [budgets]
  );

  const totalSpentInBudgets = useMemo(
    () => budgetProgressItems.reduce((sum, item) => sum + item.spent, 0),
    [budgetProgressItems]
  );

  const remainingBudget = Math.max(0, totalMonthlyBudget - totalSpentInBudgets);
  const overallUtilizationPct =
    totalMonthlyBudget > 0
      ? Math.round((totalSpentInBudgets / totalMonthlyBudget) * 100)
      : 0;

  // Unbudgeted Expenses for selected month
  const unbudgetedExpenses = useMemo(() => {
    return calculateUnbudgetedExpenses(transactions, budgets, selectedMonth, selectedYear);
  }, [transactions, budgets, selectedMonth, selectedYear]);

  const totalUnbudgeted = useMemo(
    () => unbudgetedExpenses.reduce((sum, item) => sum + item.amount, 0),
    [unbudgetedExpenses]
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Period Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Budget Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Set and track category spending thresholds for disciplined financial execution
          </p>
        </div>

        {/* Month & Year Navigation Toolbar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xs p-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 px-3 text-xs font-semibold text-slate-800 dark:text-white min-w-36 justify-center">
              <Calendar className="h-3.5 w-3.5 text-emerald-500" />
              <span>
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </span>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {!isCurrentMonthView ? (
            <button
              type="button"
              onClick={handleResetToCurrentMonth}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              Current Month
            </button>
          ) : (
            <span className="hidden sm:inline-block rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              Active Month
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingBudget(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Set Budget</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 shadow-2xs font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs text-rose-800 dark:text-rose-300 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* A. Summary Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total Monthly Budget */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Budget
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60">
              <Wallet className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-mono-nums text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatINR(totalMonthlyBudget, false)}
            </span>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Across {budgets.length} configured {budgets.length === 1 ? 'category' : 'categories'}
            </p>
          </div>
        </div>

        {/* 2. Total Spent */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Budgeted Spent
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/60">
              <TrendingDown className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-mono-nums text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatINR(totalSpentInBudgets, false)}
            </span>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              In {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </p>
          </div>
        </div>

        {/* 3. Remaining Budget */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Remaining Ceiling
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/60">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span
              className={`font-mono-nums text-2xl font-bold tracking-tight ${
                totalSpentInBudgets > totalMonthlyBudget ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
              }`}
            >
              {totalSpentInBudgets > totalMonthlyBudget
                ? `- ${formatINR(totalSpentInBudgets - totalMonthlyBudget, false)}`
                : formatINR(remainingBudget, false)}
            </span>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {totalSpentInBudgets > totalMonthlyBudget
                ? 'Over allocated ceiling'
                : 'Available spending room'}
            </p>
          </div>
        </div>

        {/* 4. Overall Utilization Percentage */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Utilization Rate
            </span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                overallUtilizationPct > 100
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                  : overallUtilizationPct >= 80
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
              }`}
            >
              <PieChart className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span
              className={`font-mono-nums text-2xl font-bold tracking-tight ${
                overallUtilizationPct > 100
                  ? 'text-rose-600 dark:text-rose-400'
                  : overallUtilizationPct >= 80
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {overallUtilizationPct}%
            </span>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  overallUtilizationPct > 100
                    ? 'bg-rose-500'
                    : overallUtilizationPct >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, overallUtilizationPct))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* B. Category Budget Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Category Allocations ({budgets.length})
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Real-time ledger updates
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-400 dark:text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
            <span className="mt-2 text-xs font-medium">Syncing monthly budgets...</span>
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-center shadow-xs">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
              <PieChart className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              No budgets created for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Define spending limits for major categories like Housing, Groceries, or Utilities. Finora automatically tracks live transaction receipts against each limit.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingBudget(null);
                setIsModalOpen(true);
              }}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Establish First Budget</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {budgetProgressItems.map((item) => {
              const b = item.budget;
              const budgetId = b.id || b._id || '';
              const isDeleting = deletingId === budgetId;
              const isConfirming = deleteConfirmId === budgetId;

              const getBarBg = () => {
                if (item.isOver) return 'bg-rose-500';
                if (item.isNear) return 'bg-amber-500';
                return 'bg-emerald-500';
              };

              return (
                <div
                  key={budgetId}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div>
                    {/* Top Row: Category Icon + Name & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                          {getCategoryIcon(b.category)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {b.category}
                          </h4>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {MONTH_NAMES[b.month - 1]} {b.year}
                          </span>
                        </div>
                      </div>

                      {/* Status Warning Badge */}
                      {item.isOver ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Over Budget</span>
                        </span>
                      ) : item.isNear ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                          <AlertCircle className="h-3 w-3" />
                          <span>80%+ Limit</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Healthy</span>
                        </span>
                      )}
                    </div>

                    {/* Spend vs Limit Figures */}
                    <div className="mt-4 flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Actual Spent:</span>
                        <div className="font-mono-nums text-lg font-bold text-slate-900 dark:text-white">
                          {formatINR(item.spent, false)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Ceiling:</span>
                        <div className="font-mono-nums text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {formatINR(item.allocated, false)}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 space-y-1.5">
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getBarBg()}`}
                          style={{ width: `${Math.min(100, Math.max(0, item.rawPct))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">
                          {item.isOver
                            ? `Breached by ${formatINR(item.spent - item.allocated, false)}`
                            : `${formatINR(item.remaining, false)} remaining`}
                        </span>
                        <span
                          className={`font-mono-nums font-bold ${
                            item.isOver
                              ? 'text-rose-600 dark:text-rose-400'
                              : item.isNear
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Category Ref: #{budgetId.slice(-4)}
                    </span>
                    <div className="flex items-center gap-1">
                      {isConfirming ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteBudget(budgetId)}
                            disabled={isDeleting}
                            className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer"
                          >
                            {isDeleting ? '...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBudget(b);
                              setIsModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Edit budget limit"
                            aria-label="Edit budget"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(budgetId)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete budget"
                            aria-label="Delete budget"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* C. Unbudgeted Expenses Section */}
      {unbudgetedExpenses.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-200/70 dark:border-amber-900/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  Unbudgeted Outflows Detected ({unbudgetedExpenses.length})
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-400">
                  Expenses recorded in {MONTH_NAMES[selectedMonth - 1]} {selectedYear} without a defined category limit
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-amber-800 dark:text-amber-400 font-medium">Uncapped Total:</span>
              <div className="font-mono-nums text-sm font-bold text-amber-950 dark:text-amber-200">
                {formatINR(totalUnbudgeted, false)}
              </div>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
            {unbudgetedExpenses.map((u) => (
              <div
                key={u.category}
                className="flex items-center justify-between rounded-xl bg-white dark:bg-[#111827] p-3.5 border border-amber-200/60 dark:border-amber-900/40 shadow-2xs"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    {u.category}
                  </div>
                  <div className="font-mono-nums text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                    {formatINR(u.amount, false)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBudget(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <span>Set Limit</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Modal */}
      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBudget(null);
        }}
        onSubmit={handleSaveBudget}
        initialData={editingBudget}
        defaultMonth={selectedMonth}
        defaultYear={selectedYear}
      />
    </div>
  );
};
