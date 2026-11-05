import React, { useState, useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  ShoppingCart,
  Home,
  Laptop,
  Train,
  Tag,
  Zap,
  Utensils,
  ExternalLink,
  CreditCard,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Transaction } from '../../types/finance';
import { formatDate, formatINR } from '../../utils/formatters';
import { useSearch } from '../../context/SearchContext';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => Promise<boolean>;
  isLoading?: boolean;
  onNavigateToTransactions?: () => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  isLoading = false,
  onNavigateToTransactions,
}) => {
  const { debouncedQuery } = useSearch();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getCategoryIcon = (category: string) => {
    const iconClass = 'h-4 w-4';
    switch (category.toLowerCase()) {
      case 'salary':
        return <Briefcase className={iconClass} />;
      case 'groceries':
      case 'food & groceries':
        return <ShoppingCart className={iconClass} />;
      case 'rent':
      case 'housing & rent':
        return <Home className={iconClass} />;
      case 'freelance':
      case 'freelance income':
        return <Laptop className={iconClass} />;
      case 'transportation':
        return <Train className={iconClass} />;
      case 'shopping':
        return <Tag className={iconClass} />;
      case 'utilities':
        return <Zap className={iconClass} />;
      case 'food & dining':
        return <Utensils className={iconClass} />;
      default:
        return <CreditCard className={iconClass} />;
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteTransaction(id);
      setDeleteConfirmId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredList = useMemo(() => {
    if (!debouncedQuery) return transactions;
    const q = debouncedQuery.toLowerCase();
    return transactions.filter(
      (t: Transaction) =>
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (t.type && t.type.toLowerCase().includes(q))
    );
  }, [transactions, debouncedQuery]);

  const previewTransactions = filteredList.slice(0, 5);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 sm:p-6 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
            Recent Transactions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Latest cash inflows and outflows
          </p>
        </div>

        {onNavigateToTransactions && (
          <button
            type="button"
            onClick={onNavigateToTransactions}
            className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <span>View All</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span className="mt-2 text-xs font-medium">Loading transactions...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 px-4 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Calendar className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
            No recent transactions
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
            Start tracking by adding your first transaction.
          </p>
          <button
            type="button"
            onClick={onAddTransaction}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Add Transaction
          </button>
        </div>
      ) : (
        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/80 flex-1">
          {previewTransactions.map((tx: Transaction) => {
            const txId = tx.id || tx._id || '';
            const isIncome = tx.type === 'income';
            const isDeleting = deletingId === txId;
            const isConfirming = deleteConfirmId === txId;

            return (
              <div
                key={txId}
                className="group flex items-center justify-between py-2.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl px-2.5"
              >
                {/* Left: Category Icon + Description + Meta */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      isIncome
                        ? 'border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                        : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {getCategoryIcon(tx.category)}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                      {tx.description || tx.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{tx.category}</span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                      <span>{formatDate(tx.date)}</span>
                      {tx.paymentMethod && (
                        <>
                          <span aria-hidden="true" className="hidden sm:inline text-slate-300 dark:text-slate-700">·</span>
                          <span className="hidden sm:inline">{tx.paymentMethod}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="shrink-0 flex items-center gap-3 pl-3">
                  <div className="text-right">
                    <div
                      className={`font-mono-nums text-xs sm:text-sm font-bold flex items-center justify-end gap-1 ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                      )}
                      <span>
                        {isIncome ? '+' : '-'} {formatINR(tx.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Edit & Delete Actions */}
                  <div className="flex items-center gap-1 border-l border-slate-100 dark:border-slate-800 pl-2">
                    {isConfirming ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(txId)}
                          disabled={isDeleting}
                          className="rounded-lg bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-rose-700 cursor-pointer"
                        >
                          {isDeleting ? '...' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="rounded-lg bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onEditTransaction(tx)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="Edit transaction"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(txId)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete transaction"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
  );
};
