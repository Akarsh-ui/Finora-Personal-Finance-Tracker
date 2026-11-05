import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { MonthlyCashFlow } from '../../types/finance';
import { formatCompactINR, formatINR } from '../../utils/formatters';
import { useTheme } from '../../context/ThemeContext';

interface IncomeExpenseChartProps {
  data: MonthlyCashFlow[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl text-xs">
        <div className="font-bold text-slate-800 dark:text-slate-200">{label}</div>
        <div className="mt-2 space-y-1.5">
          {payload.map((entry) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span
                  className="h-2 w-2 rounded-xs"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-mono-nums font-bold text-slate-900 dark:text-white">
                {formatINR(entry.value, false)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({ data }) => {
  const { resolvedTheme } = useTheme();
  const [filterPeriod, setFilterPeriod] = useState<'6m' | '3m'>('6m');

  const displayedData = filterPeriod === '3m' ? data.slice(-3) : data;
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 sm:p-6 shadow-xs transition-colors">
      {/* Header with Title and Range Filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
            Cash Flow Trends
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monthly income vs. expense comparison
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-1">
          <button
            type="button"
            onClick={() => setFilterPeriod('6m')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              filterPeriod === '6m'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Last 6 Months
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod('3m')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              filterPeriod === '3m'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Last 3 Months
          </button>
        </div>
      </div>

      {/* Chart Legend Indicators */}
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600 dark:bg-emerald-500" />
          <span className="font-medium">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-slate-300 dark:bg-slate-600" />
          <span className="font-medium">Expenses</span>
        </div>
      </div>

      {/* Recharts Bar Canvas */}
      <div className="mt-4 min-w-0 w-full flex-1" style={{ minHeight: '260px' }}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={displayedData}
            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            barGap={6}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={isDark ? '#1E293B' : '#F1F5F9'}
            />
            <XAxis
              dataKey="shortMonth"
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
              tickFormatter={(val) => formatCompactINR(val)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="income"
              name="Income"
              fill={isDark ? '#10B981' : '#059669'}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="expense"
              name="Expenses"
              fill={isDark ? '#475569' : '#94A3B8'}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
