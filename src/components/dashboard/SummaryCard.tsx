import React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { SummaryMetric } from '../../types/finance';
import { formatINR } from '../../utils/formatters';

interface SummaryCardProps {
  metric: SummaryMetric;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ metric }) => {
  // Select icon based on name
  const renderIcon = () => {
    const iconClass = 'h-5 w-5';
    switch (metric.iconName) {
      case 'wallet':
        return <Wallet className={iconClass} />;
      case 'trending-up':
        return <TrendingUp className={iconClass} />;
      case 'trending-down':
        return <TrendingDown className={iconClass} />;
      case 'piggy-bank':
        return <PiggyBank className={iconClass} />;
      default:
        return <Wallet className={iconClass} />;
    }
  };

  // Color tokens for icon container
  const getIconContainerStyle = () => {
    switch (metric.accentColor) {
      case 'emerald':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50';
      case 'blue':
        return 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/50';
      case 'rose':
        return 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50';
      case 'amber':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50';
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700';
    }
  };

  const isPositive = metric.changePercentage >= 0;

  return (
    <div className="group relative rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md">
      {/* Top row: Label and Icon */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {metric.label}
        </span>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${getIconContainerStyle()} transition-transform group-hover:scale-105`}
        >
          {renderIcon()}
        </div>
      </div>

      {/* Prominent Amount */}
      <div className="mt-3">
        <div className="font-mono-nums text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
          {formatINR(metric.amount)}
        </div>
      </div>

      {/* Secondary Indicator: Clean unboxed metadata with separators */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <div
          className={`flex items-center font-bold ${
            metric.id === 'total-expenses'
              ? metric.changeType === 'decrease'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
              : isPositive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {isPositive ? (
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
          )}
          <span className="font-mono-nums">
            {Math.abs(metric.changePercentage)}%
          </span>
        </div>
        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
        <span className="truncate">
          {metric.comparisonPeriod}
        </span>
      </div>
    </div>
  );
};
