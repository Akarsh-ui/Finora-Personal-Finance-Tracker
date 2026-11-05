import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight, AlertCircle, Loader2 } from 'lucide-react';
import { Transaction, TransactionInput, TransactionType } from '../../types/finance';
import { validateTransactionTitle, validateAmount, MAX_AMOUNT } from '../../utils/validation';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionInput, editId?: string) => Promise<boolean>;
  initialData?: Transaction | null;
  defaultType?: TransactionType;
}

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Business',
  'Gift / Bonus',
  'Other Income',
];

const EXPENSE_CATEGORIES = [
  'Housing & Rent',
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Utilities',
  'Transportation',
  'Healthcare',
  'Entertainment',
  'Education',
  'Personal Care',
  'Other Expense',
];

const PAYMENT_METHODS = ['UPI Pay', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash'];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultType = 'expense',
}) => {
  const isEditing = Boolean(initialData);

  const [type, setType] = useState<TransactionType>(defaultType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(defaultType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setDescription(initialData.description || initialData.title || '');
      setAmount(initialData.amount ? String(initialData.amount) : '');
      setCategory(initialData.category || EXPENSE_CATEGORIES[0]);
      setDate(
        initialData.date
          ? new Date(initialData.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setPaymentMethod(initialData.paymentMethod || PAYMENT_METHODS[0]);
      setNotes(initialData.notes || '');
    } else {
      setType(defaultType);
      setDescription('');
      setAmount('');
      setCategory(defaultType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod(PAYMENT_METHODS[0]);
      setNotes('');
    }
    setErrorMsg(null);
  }, [initialData, isOpen, defaultType]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income') {
      if (!INCOME_CATEGORIES.includes(category)) {
        setCategory(INCOME_CATEGORIES[0]);
      }
    } else {
      if (!EXPENSE_CATEGORIES.includes(category)) {
        setCategory(EXPENSE_CATEGORIES[0]);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const titleValidation = validateTransactionTitle(description);
    if (!titleValidation.isValid) {
      setErrorMsg(titleValidation.message || 'Please provide a valid transaction title.');
      return;
    }

    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid || amountValidation.parsedAmount === undefined) {
      setErrorMsg(amountValidation.message || 'Please enter a valid positive amount.');
      return;
    }

    if (!category.trim()) {
      setErrorMsg('Transaction category is required.');
      return;
    }

    if (!date) {
      setErrorMsg('Transaction date is required.');
      return;
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      setErrorMsg('Date is required and must be a valid date.');
      return;
    }

    if (notes.trim().length > 500) {
      setErrorMsg('Notes cannot exceed 500 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: TransactionInput = {
        title: titleValidation.sanitized!,
        description: titleValidation.sanitized!,
        amount: amountValidation.parsedAmount,
        type,
        category: category.trim(),
        date: parsedDate.toISOString(),
        paymentMethod,
        notes: notes.trim(),
        status: 'completed',
      };

      const success = await onSubmit(payload, initialData?.id || initialData?._id);
      if (success) {
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save transaction.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-4.5 bg-slate-50/50 dark:bg-slate-900/30">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {isEditing ? 'Edit Transaction' : 'Record Transaction'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEditing
                ? 'Modify transaction record details in your ledger'
                : 'Log a new cash flow entry in your account'}
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

          {/* Type Segmented Control */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Cash Flow Type
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 p-1 border border-slate-200/50 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowDownRight className="h-4 w-4 text-rose-500" />
                <span>Expense Outflow</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                <span>Income Inflow</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="tx-desc" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description / Title <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {description.length}/80
              </span>
            </div>
            <input
              id="tx-desc"
              type="text"
              required
              maxLength={80}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. AWS Cloud Services, Grocery Store, Monthly Salary"
              className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          {/* Amount in INR */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="tx-amount" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Amount (₹ INR) <span className="text-rose-500">*</span>
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
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={MAX_AMOUNT}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 py-2.5 pl-8 pr-3.5 text-xs sm:text-sm font-semibold tabular-nums text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Category & Date Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tx-cat" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                id="tx-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tx-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label htmlFor="tx-pm" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Payment Method
            </label>
            <select
              id="tx-pm"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer"
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {pm}
                </option>
              ))}
            </select>
          </div>

          {/* Notes (Optional) */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="tx-notes" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Notes <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {notes.length}/500
              </span>
            </div>
            <textarea
              id="tx-notes"
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reference number, bill tag, or reimbursement note..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 resize-none transition-colors"
            />
          </div>

          {/* Modal Actions */}
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
              className="flex items-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEditing ? (
                <span>Save Changes</span>
              ) : (
                <span>Save Transaction</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
