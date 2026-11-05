import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Download,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  BarChart3,
  CheckCircle2,
  Filter,
  LogOut,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AnalyticsData, AnalyticsPeriod } from '../types/finance';
import { formatINR, formatCompactINR, formatDate } from '../utils/formatters';
import { exportTransactionsCSV, exportFinancialReportPDF } from '../utils/reportExport';

interface AnalyticsPageProps {
  user: { name: string; email: string };
  onNavigateToTransactions?: () => void;
}

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

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  last_3_months: 'Last 3 Months',
  last_6_months: 'Last 6 Months',
  last_12_months: 'Last 12 Months',
  this_year: 'This Year',
  custom: 'Custom Range',
};

const CHART_COLORS = [
  '#059669', // Emerald
  '#0284C7', // Sky
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#10B981', // Teal
  '#64748B', // Slate
];

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ user, onNavigateToTransactions }) => {
  const { logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('last_6_months');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [appliedCustomDates, setAppliedCustomDates] = useState<{ start: string; end: string } | null>(null);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);
  const [isExportingCSV, setIsExportingCSV] = useState<boolean>(false);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);

  // Fetch analytics from authenticated backend endpoint
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let queryUrl = `/api/transactions/analytics?period=${selectedPeriod}`;
      if (selectedPeriod === 'custom' && appliedCustomDates) {
        queryUrl += `&startDate=${appliedCustomDates.start}&endDate=${appliedCustomDates.end}`;
      }

      const res = await fetch(queryUrl, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (res.status === 401) {
        setIsSessionExpired(true);
        setError('Your session has expired or authentication is required. Please log in again.');
        return;
      }

      setIsSessionExpired(false);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to fetch analytics (Status ${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        setAnalytics(data);
      } else {
        throw new Error(data.message || 'Failed to parse analytics response.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while loading analytics.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, appliedCustomDates]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handlePeriodChange = (period: AnalyticsPeriod) => {
    setSelectedPeriod(period);
    if (period !== 'custom') {
      setAppliedCustomDates(null);
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const sStr = start.toISOString().split('T')[0];
      const eStr = end.toISOString().split('T')[0];
      setCustomStartDate(sStr);
      setCustomEndDate(eStr);
      setAppliedCustomDates({ start: sStr, end: eStr });
    }
  };

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStartDate || !customEndDate) return;
    if (customStartDate > customEndDate) {
      setError('Start date cannot be after end date.');
      return;
    }
    setError(null);
    setAppliedCustomDates({ start: customStartDate, end: customEndDate });
  };

  const activePeriodLabel = useMemo(() => {
    if (selectedPeriod === 'custom' && analytics?.period) {
      return `${formatDate(analytics.period.startDate)} - ${formatDate(analytics.period.endDate)}`;
    }
    return PERIOD_LABELS[selectedPeriod] || 'Selected Period';
  }, [selectedPeriod, analytics]);

  const handleExportCSV = () => {
    if (!analytics || !analytics.transactions) return;
    setIsExportingCSV(true);
    try {
      exportTransactionsCSV(analytics.transactions, activePeriodLabel);
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportPDF = () => {
    if (!analytics) return;
    setIsExportingPDF(true);
    try {
      exportFinancialReportPDF(analytics, user, activePeriodLabel);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const summary = analytics?.summary;
  const isNegativeSavings = (summary?.netSavings || 0) < 0;

  return (
    <div className="space-y-6">
      {/* Page Header & Action Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Financial Analytics
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Cash flow variance, categorical exposure, and automated trend intelligence
          </p>
        </div>

        {/* Export and Refresh Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-emerald-500' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!analytics?.transactions || analytics.transactions.length === 0 || isExportingCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            title="Export filtered transactions as CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={!analytics || isExportingPDF}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            title="Generate Executive PDF Report"
          >
            {isExportingPDF ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>PDF Report</span>
          </button>
        </div>
      </div>

      {/* Date Period Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-4.5 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Filter className="h-4 w-4 text-emerald-500" />
            <span>Time Horizon:</span>
          </div>

          {/* Quick Period Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                'this_month',
                'last_month',
                'last_3_months',
                'last_6_months',
                'last_12_months',
                'this_year',
                'custom',
              ] as AnalyticsPeriod[]
            ).map((period) => {
              const isActive = selectedPeriod === period;
              return (
                <button
                  key={period}
                  type="button"
                  onClick={() => handlePeriodChange(period)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {PERIOD_LABELS[period]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {selectedPeriod === 'custom' && (
          <form
            onSubmit={handleApplyCustomDates}
            className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-3"
          >
            <div className="flex items-center gap-2">
              <label htmlFor="analytics-start" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                From:
              </label>
              <input
                id="analytics-start"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                required
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="analytics-end" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                To:
              </label>
              <input
                id="analytics-end"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                required
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
            >
              Apply Filter
            </button>
          </form>
        )}
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Computing financial metrics...</p>
          <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Aggregating historical ledger data and comparative variance</span>
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-6 text-center shadow-xs">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-600 dark:text-rose-400" />
          <h3 className="mt-2 text-sm font-bold text-rose-900 dark:text-rose-200">
            {isSessionExpired ? 'Session Expired' : 'Analytics Query Notice'}
          </h3>
          <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">{error}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {isSessionExpired ? (
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log In Again</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={fetchAnalytics}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Retry Loading
              </button>
            )}
          </div>
        </div>
      )}

      {!isLoading && !error && analytics && (
        <>
          {/* 1. Financial Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Income */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Income
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-mono-nums text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {formatINR(summary?.totalIncome || 0)}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  {summary && summary.incomeChangePct >= 0 ? (
                    <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      +{summary.incomeChangePct}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-rose-600 dark:text-rose-400 font-semibold">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      {summary?.incomeChangePct}%
                    </span>
                  )}
                  <span className="text-slate-400 dark:text-slate-500">vs prev period</span>
                </div>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Expenses
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                  <TrendingDown className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-mono-nums text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {formatINR(summary?.totalExpenses || 0)}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  {summary && summary.expenseChangePct > 0 ? (
                    <span className="inline-flex items-center text-rose-600 dark:text-rose-400 font-semibold">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      +{summary.expenseChangePct}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      {summary?.expenseChangePct}%
                    </span>
                  )}
                  <span className="text-slate-400 dark:text-slate-500">vs prev period</span>
                </div>
              </div>
            </div>

            {/* Net Savings */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Net Savings
                </span>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isNegativeSavings
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <div
                  className={`font-mono-nums text-2xl font-bold tracking-tight ${
                    isNegativeSavings ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {formatINR(summary?.netSavings || 0)}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {isNegativeSavings ? (
                    <span className="text-rose-600 dark:text-rose-400 font-medium">Deficit (Expenses exceed income)</span>
                  ) : (
                    <span>Inflow surplus retained</span>
                  )}
                </div>
              </div>
            </div>

            {/* Savings Rate */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Savings Rate
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                  <PiggyBank className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-mono-nums text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {summary?.savingsRate || 0}%
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  {(summary?.savingsRate || 0) >= 20 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Healthy target (&gt;20%)</span>
                  ) : (summary?.savingsRate || 0) > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">Moderate savings rate</span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">Negative savings</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Automated Financial Insights Banner */}
          {analytics.insights && analytics.insights.length > 0 && (
            <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-3.5 border-b border-emerald-100 dark:border-emerald-900/60">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Automated Financial Insights
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  (Evaluated from your actual ledger records)
                </span>
              </div>

              <div className="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {analytics.insights.map((insight) => {
                  const isWarning = insight.type === 'warning';
                  const isPos = insight.type === 'positive';

                  return (
                    <div
                      key={insight.id}
                      className="rounded-xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-3.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {isWarning ? (
                            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                          ) : isPos ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <BarChart3 className="h-4 w-4 text-sky-500 shrink-0" />
                          )}
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{insight.title}</h4>
                        </div>
                        {insight.metricText && (
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              isWarning
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                                : isPos
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {insight.metricText}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {insight.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Income vs Expense Trend Analysis */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  Inflow vs Outflow Velocity
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Monthly cash flow inflows and expenditures for {activePeriodLabel}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Income</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span>Expense</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  <span>Net Savings</span>
                </span>
              </div>
            </div>

            <div className="mt-5 h-72 w-full">
              {analytics.monthlyTrends && analytics.monthlyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.monthlyTrends}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1E293B' : '#E2E8F0'} />
                    <XAxis
                      dataKey="shortMonth"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                      tickFormatter={(val) => formatCompactINR(val)}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        formatINR(Number(value) || 0),
                        name === 'income' ? 'Income' : name === 'expense' ? 'Expense' : 'Savings',
                      ]}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{
                        backgroundColor: isDark ? '#111827' : '#FFFFFF',
                        borderRadius: '12px',
                        border: isDark ? '1px solid #1F2937' : '1px solid #E2E8F0',
                        color: isDark ? '#F9FAFB' : '#0F172A',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Bar dataKey="income" name="income" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={38} />
                    <Bar dataKey="expense" name="expense" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={38} />
                    <Bar dataKey="savings" name="savings" fill="#0284C7" radius={[4, 4, 0, 0]} maxBarSize={38} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                  No monthly activity recorded in this period.
                </div>
              )}
            </div>
          </div>

          {/* 4. Expense & Income Analysis Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Category-Wise Expense Analysis */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                      Expense Category Distribution
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Breakdown and top spending categories
                    </p>
                  </div>
                  {analytics.highestExpenseCategory && (
                    <div className="text-right">
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500">Highest Category</span>
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        {analytics.highestExpenseCategory.category} (
                        {analytics.highestExpenseCategory.percentage}%)
                      </span>
                    </div>
                  )}
                </div>

                {analytics.expenseBreakdown && analytics.expenseBreakdown.length > 0 ? (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    {/* Donut Chart */}
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.expenseBreakdown}
                            dataKey="amount"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {analytics.expenseBreakdown.map((entry, index) => (
                              <Cell
                                key={`cell-exp-${index}`}
                                fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [formatINR(Number(value) || 0), 'Spent']}
                            contentStyle={{
                              backgroundColor: isDark ? '#111827' : '#FFFFFF',
                              borderRadius: '12px',
                              border: isDark ? '1px solid #1F2937' : '1px solid #E2E8F0',
                              color: isDark ? '#F9FAFB' : '#0F172A',
                              fontSize: '12px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Top 5 Categories List */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Top Outflow Categories
                      </h4>
                      {analytics.top5Expenses.map((cat, idx) => (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                              {idx + 1}. {cat.category}
                            </span>
                            <div className="flex items-center gap-1.5 font-mono-nums">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {formatINR(cat.amount)}
                              </span>
                              <span className="text-slate-400 dark:text-slate-500">({cat.percentage}%)</span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, cat.percentage)}%`,
                                backgroundColor: cat.color || '#059669',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">
                    No expense transactions logged in {activePeriodLabel}.
                  </div>
                )}
              </div>
            </div>

            {/* Income Source Analysis */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                      Income Sources & Inflows
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Revenue distribution by earning stream
                    </p>
                  </div>
                  {analytics.highestIncomeCategory && (
                    <div className="text-right">
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500">Primary Source</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {analytics.highestIncomeCategory.category} (
                        {analytics.highestIncomeCategory.percentage}%)
                      </span>
                    </div>
                  )}
                </div>

                {analytics.incomeBreakdown && analytics.incomeBreakdown.length > 0 ? (
                  <div className="mt-4 space-y-3.5">
                    {analytics.incomeBreakdown.map((item, idx) => (
                      <div key={item.category} className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[11px] font-bold text-emerald-800 dark:text-emerald-400">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white">{item.category}</span>
                          </div>
                          <div className="text-right font-mono-nums">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatINR(item.amount)}</span>
                            <span className="ml-1.5 text-slate-400 dark:text-slate-500">({item.percentage}%)</span>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300"
                            style={{ width: `${Math.min(100, item.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">
                    No income transactions logged in {activePeriodLabel}.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Filtered Period Transactions Ledger Preview */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  Period Ledger Snapshot ({analytics.transactions.length} records)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Transactions contributing to these analytics metrics
                </p>
              </div>

              {onNavigateToTransactions && (
                <button
                  type="button"
                  onClick={onNavigateToTransactions}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <span>Open Full Ledger</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {analytics.transactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                No transactions found in this period timeframe.
              </div>
            ) : (
              <div className="mt-3.5 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Payment Method</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-800 dark:text-slate-200">
                    {analytics.transactions.slice(0, 10).map((t) => {
                      const isIncome = t.type === 'income';
                      return (
                        <tr key={t._id || t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-500 dark:text-slate-400">
                            {formatDate(t.date)}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                            {t.description || t.title}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                isIncome
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {isIncome ? 'Income' : 'Expense'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{t.category}</td>
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{t.paymentMethod || '—'}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono-nums font-bold ${
                              isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {isIncome ? '+' : '-'} {formatINR(t.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {analytics.transactions.length > 10 && (
                  <div className="pt-3 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
                    Showing top 10 of {analytics.transactions.length} records. Download CSV or PDF to view all transactions.
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
