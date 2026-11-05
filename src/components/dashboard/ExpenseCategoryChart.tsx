import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { CategoryExpense } from '../../types/finance';
import { formatINR } from '../../utils/formatters';

interface ExpenseCategoryChartProps {
  data: CategoryExpense[];
  onCategoryClick?: (category: string) => void;
  selectedCategory?: string | null;
}

interface CustomPieTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: CategoryExpense;
  }>;
}

const CustomPieTooltip: React.FC<CustomPieTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.category}
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-3 text-slate-600 dark:text-slate-400">
          <span className="font-mono-nums font-bold text-slate-900 dark:text-white">
            {formatINR(item.amount)}
          </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {item.percentage}%
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const ExpenseCategoryChart: React.FC<ExpenseCategoryChartProps> = ({
  data,
  onCategoryClick,
  selectedCategory,
}) => {
  const totalExpense = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 sm:p-6 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
            Expenses by Category
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Distribution of your spending across categories
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">Total Outflow</span>
          <span className="font-mono-nums text-sm font-bold text-slate-900 dark:text-white">{formatINR(totalExpense, false)}</span>
        </div>
      </div>

      {/* Donut Chart & Legend Split */}
      {data.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No expense records</p>
          <span className="mt-1 text-[11px] text-slate-400">Logged expenses will populate this categorical breakdown.</span>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-4 lg:flex-row">
          {/* Donut Canvas */}
          <div className="relative h-52 w-52 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomPieTooltip />} />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={3}
                  dataKey="amount"
                  onClick={(entry: any) => {
                    const cat = entry?.category || entry?.payload?.category;
                    if (onCategoryClick && cat) {
                      onCategoryClick(cat);
                    }
                  }}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.category}
                      fill={entry.color}
                      opacity={selectedCategory && selectedCategory !== entry.category ? 0.35 : 1}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Centered Total Indicator */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Outflow
              </span>
              <span className="font-mono-nums text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                {formatINR(totalExpense, false)}
              </span>
            </div>
          </div>

          {/* Category List Legend */}
          <div className="w-full flex-1 space-y-2">
            {data.map((item) => {
              const isSelected = selectedCategory === item.category;
              return (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => onCategoryClick && onCategoryClick(item.category)}
                  className={`flex w-full items-center justify-between gap-2 text-xs py-1.5 px-2 rounded-lg transition-all ${
                    onCategoryClick ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800' : ''
                  } ${
                    isSelected ? 'bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-500/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono-nums text-slate-500 dark:text-slate-400">
                      {formatINR(item.amount, false)}
                    </span>
                    <span className="font-mono-nums font-bold text-slate-900 dark:text-white w-10 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
