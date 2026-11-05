import React from 'react';
import { BudgetProgress } from '../../types/finance';
import { formatINR, calculatePercentage } from '../../utils/formatters';
import { AlertCircle, AlertTriangle, ArrowRight, PieChart, CheckCircle2 } from 'lucide-react';

interface BudgetOverviewProps {
  budgets: BudgetProgress[];
  onNavigateToBudgets?: () => void;
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({
  budgets,
  onNavigateToBudgets,
}) => {
  const totalAllocated = budgets.reduce((acc, curr) => acc + curr.allocated, 0);
  const totalSpent = budgets.reduce((acc, curr) => acc + curr.spent, 0);
  const overallPercentage = totalAllocated > 0 ? calculatePercentage(totalSpent, totalAllocated) : 0;
  const isOverallExceeded = totalSpent > totalAllocated;
  const overallExceededAmount = isOverallExceeded ? totalSpent - totalAllocated : 0;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 sm:p-6 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
            Budget Status
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Active category spending limits
          </p>
        </div>
        {budgets.length > 0 ? (
          <div className="text-right">
            <span
              className={`font-mono-nums text-xs font-bold ${
                isOverallExceeded
                  ? 'text-rose-600 dark:text-rose-400'
                  : overallPercentage >= 80
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {overallPercentage}% Utilized
            </span>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono-nums">
              {formatINR(totalSpent, false)} / {formatINR(totalAllocated, false)}
            </p>
          </div>
        ) : onNavigateToBudgets ? (
          <button
            type="button"
            onClick={onNavigateToBudgets}
            className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <span>Set Limits</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Overall Exceeded Alert Pill (if applicable) */}
      {isOverallExceeded && (
        <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs text-rose-800 dark:text-rose-300 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>Overall spending exceeded total budget by {formatINR(overallExceededAmount, false)}.</span>
        </div>
      )}

      {/* Content */}
      {budgets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-500">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <PieChart className="h-5 w-5" />
          </div>
          <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">No active budgets</p>
          <span className="mt-0.5 text-[11px] text-slate-400 max-w-[220px]">
            Define monthly category limits to activate automatic overspending alerts.
          </span>
          {onNavigateToBudgets && (
            <button
              type="button"
              onClick={onNavigateToBudgets}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <span>Create Budget</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            {budgets.slice(0, 4).map((b) => {
              const pct = b.allocated > 0 ? calculatePercentage(b.spent, b.allocated) : 0;
              const isOver = b.spent > b.allocated;
              const isWarning = !isOver && pct >= 80;
              const excessAmount = isOver ? b.spent - b.allocated : 0;
              const remainingAmount = Math.max(0, b.allocated - b.spent);

              return (
                <div key={b.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {b.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isOver && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>+{formatINR(excessAmount, false)}</span>
                        </span>
                      )}
                      {isWarning && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>80%+ Limit</span>
                        </span>
                      )}
                      {!isOver && !isWarning && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Healthy</span>
                        </span>
                      )}
                      <span
                        className={`font-mono-nums font-bold ml-1 ${
                          isOver
                            ? 'text-rose-600 dark:text-rose-400'
                            : isWarning
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOver
                          ? 'bg-rose-600 dark:bg-rose-500'
                          : isWarning
                          ? 'bg-amber-500 dark:bg-amber-400'
                          : 'bg-emerald-600 dark:bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono-nums">
                    <span>
                      {isOver
                        ? `Exceeded limit by ${formatINR(excessAmount, false)}`
                        : `${formatINR(remainingAmount, false)} room remaining`}
                    </span>
                    <span>Cap: {formatINR(b.allocated, false)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {onNavigateToBudgets && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onNavigateToBudgets}
                className="flex w-full items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors py-1 cursor-pointer"
              >
                <span>View all monthly budgets ({budgets.length})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
