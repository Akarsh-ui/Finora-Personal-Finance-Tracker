import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { Budget, BudgetInput } from '../../types/finance';
import { validateBudgetCategory, validateAmount, MAX_AMOUNT } from '../../utils/validation';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BudgetInput, editId?: string) => Promise<boolean>;
  initialData?: Budget | null;
  defaultMonth: number;
  defaultYear: number;
}

const BUDGET_CATEGORIES = [
  'Housing & Rent',
  'Food & Groceries',
  'Food & Dining',
  'Shopping',
  'Utilities',
  'Transportation',
  'Healthcare',
  'Entertainment',
  'Education',
  'Personal Care',
  'Other Expense',
];

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

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultMonth,
  defaultYear,
}) => {
  const isEditing = Boolean(initialData);

  const [category, setCategory] = useState(BUDGET_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [month, setMonth] = useState<number>(defaultMonth);
  const [year, setYear] = useState<number>(defaultYear);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      if (BUDGET_CATEGORIES.includes(initialData.category)) {
        setCategory(initialData.category);
        setCustomCategory('');
      } else {
        setCategory('Custom');
        setCustomCategory(initialData.category);
      }
      setMonthlyLimit(String(initialData.monthlyLimit));
      setMonth(initialData.month);
      setYear(initialData.year);
    } else {
      setCategory(BUDGET_CATEGORIES[0]);
      setCustomCategory('');
      setMonthlyLimit('');
      setMonth(defaultMonth);
      setYear(defaultYear);
    }
    setErrorMsg(null);
  }, [initialData, isOpen, defaultMonth, defaultYear]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const finalCategory = (category === 'Custom' ? customCategory : category).trim();
    const catValidation = validateBudgetCategory(finalCategory);
    if (!catValidation.isValid) {
      setErrorMsg(catValidation.message || 'Please specify a valid category name.');
      return;
    }

    const limitValidation = validateAmount(monthlyLimit);
    if (!limitValidation.isValid || limitValidation.parsedAmount === undefined) {
      setErrorMsg(limitValidation.message || 'Please enter a valid positive monthly limit.');
      return;
    }

    if (month < 1 || month > 12) {
      setErrorMsg('Month must be between 1 and 12.');
      return;
    }

    if (year < 2000 || year > 2100) {
      setErrorMsg('Year must be between 2000 and 2100.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: BudgetInput = {
        category: catValidation.sanitized!,
        monthlyLimit: limitValidation.parsedAmount,
        month,
        year,
      };

      const success = await onSubmit(payload, initialData?.id || initialData?._id);
      if (success) {
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save budget.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const years = [defaultYear - 1, defaultYear, defaultYear + 1];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-4.5 bg-slate-50/50 dark:bg-slate-900/30">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {isEditing ? 'Adjust Category Budget' : 'Set Category Budget'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Spending threshold for {MONTH_NAMES[month - 1]} {year}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4.5">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Month & Year Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="budget-month" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Billing Month
              </label>
              <select
                id="budget-month"
                disabled={isEditing}
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden disabled:opacity-50 cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="budget-year" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Year
              </label>
              <select
                id="budget-year"
                disabled={isEditing}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden disabled:opacity-50 cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="budget-cat" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Expense Category
            </label>
            <select
              id="budget-cat"
              disabled={isEditing}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden disabled:opacity-50 cursor-pointer"
            >
              {BUDGET_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {c}
                </option>
              ))}
              <option value="Custom" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                + Custom Category...
              </option>
            </select>
          </div>

          {category === 'Custom' && (
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="budget-custom-cat" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Custom Category Name
                </label>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {customCategory.length}/50
                </span>
              </div>
              <input
                id="budget-custom-cat"
                type="text"
                maxLength={50}
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Subscriptions, Pet Care, Fitness"
                className="mt-1.5 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          )}

          {/* Monthly Limit */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="budget-limit" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Monthly Ceiling (₹ INR) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Max ₹10 Cr
              </span>
            </div>
            <div className="relative mt-1.5">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-400 dark:text-slate-500 text-sm">
                ₹
              </span>
              <input
                id="budget-limit"
                type="number"
                step="100"
                min="1"
                max={MAX_AMOUNT}
                required
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-8 pr-3.5 text-xs sm:text-sm font-semibold tabular-nums text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              Automatic alerts are dispatched at 80% warning and 100% cap breach.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEditing ? (
                <span>Save Limit</span>
              ) : (
                <span>Save Budget</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
