import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  RotateCcw,
  Loader2,
  Briefcase,
  ShoppingCart,
  Home,
  Laptop,
  Train,
  Tag,
  Zap,
  Utensils,
  CreditCard,
  SlidersHorizontal,
} from 'lucide-react';
import { Transaction, TransactionInput } from '../types/finance';
import { TransactionModal } from '../components/dashboard/TransactionModal';
import { formatDate, formatINR } from '../utils/formatters';
import { useSearch } from '../context/SearchContext';
import { notifyTransactionsOrBudgetsChanged } from '../context/NotificationContext';

interface TransactionsPageProps {
  user?: {
    name: string;
    email: string;
  };
}

const CATEGORIES = [
  'All',
  'Salary',
  'Freelance',
  'Investment',
  'Housing & Rent',
  'Food & Groceries',
  'Food & Dining',
  'Shopping',
  'Utilities',
  'Transportation',
  'Healthcare',
  'Entertainment',
  'Other',
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

export const TransactionsPage: React.FC<TransactionsPageProps> = () => {
  const { searchQuery, setSearchQuery, debouncedQuery, clearSearch } = useSearch();

  // Filter States
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Advanced Filter Drawer Toggle
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modal and Delete States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Category Icon helper
  const getCategoryIcon = (category: string) => {
    const iconClass = 'h-4 w-4';
    switch (category.toLowerCase()) {
      case 'salary':
        return <Briefcase className={iconClass} />;
      case 'freelance':
      case 'freelance income':
        return <Laptop className={iconClass} />;
      case 'groceries':
      case 'food & groceries':
        return <ShoppingCart className={iconClass} />;
      case 'food & dining':
        return <Utensils className={iconClass} />;
      case 'housing & rent':
      case 'rent':
        return <Home className={iconClass} />;
      case 'transportation':
        return <Train className={iconClass} />;
      case 'shopping':
        return <Tag className={iconClass} />;
      case 'utilities':
        return <Zap className={iconClass} />;
      default:
        return <CreditCard className={iconClass} />;
    }
  };

  // Fetch Summary Data
  const loadLedgerSummaries = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions?limit=500', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.transactions)) {
          setAllTransactions(data.transactions);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch Filtered & Paginated Transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      // Guard against logically inverted filter ranges
      if (startDate && endDate && startDate > endDate) {
        setErrorMsg('Start date cannot be after end date. Please adjust your date boundaries.');
        setIsLoading(false);
        return;
      }

      if (minAmount && maxAmount && parseFloat(minAmount) > parseFloat(maxAmount)) {
        setErrorMsg('Minimum amount cannot be greater than maximum amount. Please adjust your amount bounds.');
        setIsLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (debouncedQuery) params.append('search', debouncedQuery);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (categoryFilter !== 'All') params.append('category', categoryFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (minAmount) params.append('minAmount', minAmount);
      if (maxAmount) params.append('maxAmount', maxAmount);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', String(page));
      params.append('limit', String(pageSize));

      const res = await fetch(`/api/transactions?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to load transactions (HTTP ${res.status})`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        setTotalRecords(data.total !== undefined ? data.total : data.count || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching transactions';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, typeFilter, categoryFilter, startDate, endDate, minAmount, maxAmount, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, typeFilter, categoryFilter, startDate, endDate, minAmount, maxAmount, sortBy, sortOrder]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    loadLedgerSummaries();
  }, [loadLedgerSummaries]);

  const handleClearFilters = () => {
    clearSearch();
    setTypeFilter('all');
    setCategoryFilter('All');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('date');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
    typeFilter !== 'all' ||
    categoryFilter !== 'All' ||
    startDate ||
    endDate ||
    minAmount ||
    maxAmount ||
    sortBy !== 'date' ||
    sortOrder !== 'desc'
  );

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

      setSuccessMsg(editId ? 'Transaction record updated.' : 'Transaction recorded into ledger.');
      setTimeout(() => setSuccessMsg(null), 3000);

      await Promise.all([fetchTransactions(), loadLedgerSummaries()]);
      notifyTransactionsOrBudgetsChanged();
      return true;
    } catch (err: unknown) {
      throw err;
    }
  };

  const handleDeleteTransaction = async (id: string): Promise<void> => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete transaction');
      }

      setSuccessMsg('Transaction deleted.');
      setTimeout(() => setSuccessMsg(null), 3000);
      setDeleteConfirmId(null);

      await Promise.all([fetchTransactions(), loadLedgerSummaries()]);
      notifyTransactionsOrBudgetsChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed.';
      setErrorMsg(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const totalIncome = useMemo(
    () => allTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [allTransactions]
  );
  const totalExpenses = useMemo(
    () => allTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [allTransactions]
  );
  const netBalance = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Transactions Ledger
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Search, filter, audit, and manage your complete historical financial records
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingTransaction(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Record Transaction</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 shadow-2xs font-medium">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs text-rose-800 dark:text-rose-300 font-medium">
          {errorMsg}
        </div>
      )}

      {/* A. Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Records
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Receipt className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-mono-nums text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {allTransactions.length}
            </span>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {totalRecords} matching current query
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Cumulative Inflows
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-mono-nums text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatINR(totalIncome, false)}
            </span>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {allTransactions.filter((t) => t.type === 'income').length} income entries
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Cumulative Outflows
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <TrendingDown className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-mono-nums text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {formatINR(totalExpenses, false)}
            </span>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {allTransactions.filter((t) => t.type === 'expense').length} expense entries
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Net Liquidity
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Wallet className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span
              className={`font-mono-nums text-2xl font-bold tracking-tight ${
                netBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatINR(netBalance, false)}
            </span>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Income minus expenses
            </p>
          </div>
        </div>
      </div>

      {/* B. Search & Filters Bar */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111827] p-4.5 shadow-xs space-y-3.5">
        {/* Main Toolbar Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by description, category, payment method, or notes..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-9 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                title="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-900/80 p-1 border border-slate-200/50 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('income')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                typeFilter === 'income'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('expense')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                typeFilter === 'expense'
                  ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Expense
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="shrink-0">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb as 'date' | 'amount');
                setSortOrder(so as 'desc' | 'asc');
              }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="date-desc" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Newest First</option>
              <option value="date-asc" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Oldest First</option>
              <option value="amount-desc" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Highest Amount</option>
              <option value="amount-asc" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Lowest Amount</option>
            </select>
          </div>

          {/* Advanced Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              showAdvancedFilters || hasActiveFilters
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Expandable Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Amount Range (₹)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
                />
                <span className="text-slate-400 dark:text-slate-600 text-xs">-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Applied:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                "{searchQuery}"
                <button type="button" onClick={clearSearch} className="hover:text-emerald-950 dark:hover:text-white cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {typeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Type: {typeFilter}
                <button type="button" onClick={() => setTypeFilter('all')} className="cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {categoryFilter !== 'All' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Category: {categoryFilter}
                <button type="button" onClick={() => setCategoryFilter('All')} className="cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Date: {startDate || 'Start'} to {endDate || 'Now'}
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {(minAmount || maxAmount) && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Amount: ₹{minAmount || '0'} - ₹{maxAmount || '∞'}
                <button
                  type="button"
                  onClick={() => {
                    setMinAmount('');
                    setMaxAmount('');
                  }}
                  className="cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleClearFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset All</span>
            </button>
          </div>
        )}
      </div>

      {/* C. Transactions Table / List */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111827] shadow-xs overflow-hidden">
        {/* Table Header Row */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Matching Records
            </h2>
            <span className="rounded-md bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {totalRecords}
            </span>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Page {page} of {totalPages}
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
            <span className="mt-2 text-xs font-medium">Retrieving transaction ledger...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
              <Search className="h-6 w-6" />
            </div>
            <h4 className="mt-3.5 text-sm font-bold text-slate-800 dark:text-slate-200">
              No matching records found
            </h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Try adjusting your query keywords, widening amount/date ranges, or creating a new transaction.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {transactions.map((tx) => {
              const txId = tx.id || tx._id || '';
              const isIncome = tx.type === 'income';
              const isDeleting = deletingId === txId;
              const isConfirming = deleteConfirmId === txId;

              return (
                <div
                  key={txId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-6 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Left: Icon + Title + Meta */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        isIncome
                          ? 'border-emerald-200/60 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {getCategoryIcon(tx.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {tx.description || tx.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{tx.category}</span>
                        <span>·</span>
                        <span>{formatDate(tx.date)}</span>
                        {tx.paymentMethod && (
                          <>
                            <span>·</span>
                            <span>{tx.paymentMethod}</span>
                          </>
                        )}
                        {tx.notes && (
                          <span className="text-slate-400 dark:text-slate-500 italic hidden md:inline truncate max-w-xs">
                            — "{tx.notes}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-13 sm:pl-0">
                    <div className="text-right">
                      <div
                        className={`font-mono-nums text-sm sm:text-base font-bold flex items-center justify-end gap-1 ${
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <span>
                          {isIncome ? '+' : '-'} {formatINR(tx.amount)}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold tracking-wider uppercase ${
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </div>

                    {/* Quick Edit and Delete Actions */}
                    <div className="flex items-center gap-1 border-l border-slate-100 dark:border-slate-800/80 pl-3">
                      {isConfirming ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(txId)}
                            disabled={isDeleting}
                            className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer"
                          >
                            {isDeleting ? '...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTransaction(tx);
                              setIsModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Edit transaction"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(txId)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete transaction"
                            aria-label="Delete"
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

        {/* D. Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 px-6 py-3.5 bg-slate-50/50 dark:bg-slate-900/30">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, totalRecords)} of {totalRecords} records
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
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
