import type {
  Transaction,
  SummaryMetric,
  MonthlyCashFlow,
  CategoryExpense,
  BudgetProgress,
  Budget,
} from '../types/finance.ts';

const CATEGORY_COLORS: Record<string, string> = {
  'Housing & Rent': '#0F766E',
  'Rent': '#0F766E',
  'Food & Groceries': '#10B981',
  'Groceries': '#10B981',
  'Food & Dining': '#14B8A6',
  'Shopping': '#6366F1',
  'Shopping & Lifestyle': '#6366F1',
  'Utilities': '#F59E0B',
  'Utilities & Bills': '#F59E0B',
  'Transportation': '#0284C7',
  'Healthcare': '#EC4899',
  'Entertainment': '#8B5CF6',
  'Education': '#3B82F6',
  'Personal Care': '#F43F5E',
  'Investment': '#10B981',
  'Salary': '#059669',
  'Freelance': '#0284C7',
  'Other': '#64748B',
};

const DEFAULT_COLOR_PALETTE = [
  '#0F766E',
  '#10B981',
  '#6366F1',
  '#F59E0B',
  '#0284C7',
  '#EC4899',
  '#8B5CF6',
  '#64748B',
];

/**
 * Compute real Summary Metrics from user transactions
 */
export function calculateSummaryMetrics(transactions: Transaction[]): SummaryMetric[] {
  let totalIncome = 0;
  let totalExpenses = 0;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let currentMonthIncome = 0;
  let currentMonthExpenses = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;
    const txDate = new Date(tx.date);
    const isThisMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;

    if (tx.type === 'income') {
      totalIncome += amt;
      if (isThisMonth) currentMonthIncome += amt;
    } else if (tx.type === 'expense') {
      totalExpenses += amt;
      if (isThisMonth) currentMonthExpenses += amt;
    }
  }

  const currentBalance = totalIncome - totalExpenses;
  const currentMonthSavings = currentMonthIncome - currentMonthExpenses;
  
  let savingsRate = 0;
  let savingsLabel = 'No activity this month';
  let savingsChangeType: 'increase' | 'decrease' | 'neutral' = 'neutral';
  let savingsPercentage = 0;

  if (currentMonthIncome > 0) {
    savingsRate = (currentMonthSavings / currentMonthIncome) * 100;
    savingsPercentage = Math.round(savingsRate);
    if (currentMonthSavings >= 0) {
      savingsChangeType = 'increase';
      savingsLabel = `${savingsRate.toFixed(1)}% savings rate this month`;
    } else {
      savingsChangeType = 'decrease';
      savingsLabel = `${Math.abs(savingsRate).toFixed(1)}% deficit this month`;
    }
  } else if (currentMonthExpenses > 0) {
    savingsRate = -100;
    savingsPercentage = -100;
    savingsChangeType = 'decrease';
    savingsLabel = '100% outflow (no income logged this month)';
  }

  return [
    {
      id: 'total-balance',
      label: 'Total Balance',
      amount: currentBalance,
      currency: 'INR',
      changePercentage: 0,
      changeType: currentBalance >= 0 ? 'increase' : 'decrease',
      comparisonPeriod: totalIncome === 0 && totalExpenses === 0 ? 'No transactions logged' : 'Calculated Net Balance',
      iconName: 'wallet',
      accentColor: 'blue',
    },
    {
      id: 'total-income',
      label: 'Total Income',
      amount: totalIncome,
      currency: 'INR',
      changePercentage: 0,
      changeType: 'increase',
      comparisonPeriod: `${transactions.filter((t) => t.type === 'income').length} income records`,
      iconName: 'trending-up',
      accentColor: 'emerald',
    },
    {
      id: 'total-expenses',
      label: 'Total Expenses',
      amount: totalExpenses,
      currency: 'INR',
      changePercentage: 0,
      changeType: 'decrease',
      comparisonPeriod: `${transactions.filter((t) => t.type === 'expense').length} expense records`,
      iconName: 'trending-down',
      accentColor: 'rose',
    },
    {
      id: 'monthly-savings',
      label: 'Monthly Savings',
      amount: currentMonthSavings,
      currency: 'INR',
      changePercentage: savingsPercentage,
      changeType: savingsChangeType,
      comparisonPeriod: savingsLabel,
      iconName: 'piggy-bank',
      accentColor: currentMonthSavings >= 0 ? 'emerald' : 'rose',
    },
  ];
}

/**
 * Compute monthly cash flow distribution for IncomeExpenseChart
 */
export function calculateMonthlyCashFlow(transactions: Transaction[]): MonthlyCashFlow[] {
  const months: MonthlyCashFlow[] = [];
  const now = new Date();

  // Generate last 6 calendar months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const shortMonth = d.toLocaleString('en-US', { month: 'short' });

    months.push({
      month: monthName,
      shortMonth,
      income: 0,
      expense: 0,
      savings: 0,
    });
  }

  // Populate from transactions
  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    const txMonth = txDate.getMonth();
    const txYear = txDate.getFullYear();

    for (let i = 0; i < 6; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      if (txMonth === targetDate.getMonth() && txYear === targetDate.getFullYear()) {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'income') {
          months[i].income += amt;
        } else if (tx.type === 'expense') {
          months[i].expense += amt;
        }
        months[i].savings = months[i].income - months[i].expense;
        break;
      }
    }
  }

  return months;
}

/**
 * Compute category breakdown for ExpenseCategoryChart
 */
export function calculateCategoryExpenses(transactions: Transaction[]): CategoryExpense[] {
  const categoryMap: Record<string, number> = {};
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.type === 'expense') {
      const cat = tx.category || 'Other';
      const amt = Number(tx.amount) || 0;
      categoryMap[cat] = (categoryMap[cat] || 0) + amt;
      totalExpense += amt;
    }
  }

  const result: CategoryExpense[] = [];
  const entries = Object.entries(categoryMap);

  // If no expenses, return empty array
  if (entries.length === 0 || totalExpense === 0) {
    return [];
  }

  entries.sort((a, b) => b[1] - a[1]);

  let paletteIndex = 0;
  for (const [cat, amt] of entries) {
    const color =
      CATEGORY_COLORS[cat] ||
      DEFAULT_COLOR_PALETTE[paletteIndex % DEFAULT_COLOR_PALETTE.length];
    paletteIndex++;

    const percentage = totalExpense > 0 ? Number(((amt / totalExpense) * 100).toFixed(1)) : 0;

    result.push({
      category: cat,
      amount: amt,
      percentage,
      color,
    });
  }

  return result;
}

/**
 * Compute spending against real user-defined budgets using transactions
 */
export function calculateBudgetProgress(
  transactions: Transaction[],
  budgets: Budget[] = [],
  month?: number,
  year?: number
): BudgetProgress[] {
  if (!budgets || budgets.length === 0) {
    return [];
  }

  const now = new Date();
  const targetMonth = month !== undefined ? month : now.getMonth() + 1; // 1-indexed
  const targetYear = year !== undefined ? year : now.getFullYear();

  // Aggregate expenses for target month and year per category
  const spentMap: Record<string, number> = {};

  for (const tx of transactions) {
    if (tx.type === 'expense') {
      const txDate = new Date(tx.date);
      // getMonth() is 0-indexed, so add 1 to compare with 1-indexed budget.month
      const txMonth = txDate.getMonth() + 1;
      const txYear = txDate.getFullYear();

      if (txMonth === targetMonth && txYear === targetYear) {
        const cat = (tx.category || '').trim();
        spentMap[cat] = (spentMap[cat] || 0) + (Number(tx.amount) || 0);
      }
    }
  }

  return budgets
    .filter((b) => b.month === targetMonth && b.year === targetYear)
    .map((b) => {
      const budgetCat = (b.category || '').trim();
      let spent = spentMap[budgetCat] || 0;

      // Handle common synonymous categories
      if (budgetCat === 'Food & Groceries') {
        spent += (spentMap['Groceries'] || 0) + (spentMap['Food & Dining'] || 0);
      } else if (budgetCat === 'Housing & Rent') {
        spent += spentMap['Rent'] || 0;
      } else if (budgetCat === 'Utilities') {
        spent += spentMap['Utilities & Bills'] || 0;
      } else if (budgetCat === 'Shopping') {
        spent += spentMap['Shopping & Lifestyle'] || 0;
      }

      const color =
        CATEGORY_COLORS[budgetCat] ||
        DEFAULT_COLOR_PALETTE[Math.abs(budgetCat.length) % DEFAULT_COLOR_PALETTE.length];

      return {
        id: b.id || b._id || `bgt-${budgetCat}`,
        category: budgetCat,
        allocated: b.monthlyLimit,
        spent,
        color,
      };
    });
}

/**
 * Find expenses for categories that do NOT have an active budget for the target month
 */
export function calculateUnbudgetedExpenses(
  transactions: Transaction[],
  budgets: Budget[] = [],
  month?: number,
  year?: number
): { category: string; amount: number }[] {
  const now = new Date();
  const targetMonth = month !== undefined ? month : now.getMonth() + 1;
  const targetYear = year !== undefined ? year : now.getFullYear();

  const budgetedCategories = new Set(
    budgets
      .filter((b) => b.month === targetMonth && b.year === targetYear)
      .map((b) => b.category.trim().toLowerCase())
  );

  const unbudgetedMap: Record<string, number> = {};

  for (const tx of transactions) {
    if (tx.type === 'expense') {
      const txDate = new Date(tx.date);
      const txMonth = txDate.getMonth() + 1;
      const txYear = txDate.getFullYear();

      if (txMonth === targetMonth && txYear === targetYear) {
        const cat = (tx.category || '').trim();
        const lowerCat = cat.toLowerCase();

        // Check if covered by a budget category or synonym
        let isCovered = budgetedCategories.has(lowerCat);
        if (budgetedCategories.has('food & groceries') && (lowerCat === 'groceries' || lowerCat === 'food & dining')) {
          isCovered = true;
        }
        if (budgetedCategories.has('housing & rent') && lowerCat === 'rent') {
          isCovered = true;
        }
        if (budgetedCategories.has('utilities') && lowerCat === 'utilities & bills') {
          isCovered = true;
        }

        if (!isCovered) {
          unbudgetedMap[cat] = (unbudgetedMap[cat] || 0) + (Number(tx.amount) || 0);
        }
      }
    }
  }

  return Object.entries(unbudgetedMap).map(([category, amount]) => ({
    category,
    amount,
  }));
}
