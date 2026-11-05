import {
  SummaryMetric,
  Transaction,
  MonthlyCashFlow,
  CategoryExpense,
  BudgetProgress,
  UserProfile,
} from '../types/finance';

export const mockUserProfile: UserProfile = {
  name: 'Akarsh Saini',
  email: 'akarsh.saini@finora.internal',
  role: 'Personal Account',
  initials: 'AS',
};

export const mockSummaryMetrics: SummaryMetric[] = [
  {
    id: 'total-balance',
    label: 'Total Balance',
    amount: 482500,
    currency: 'INR',
    changePercentage: 8.4,
    changeType: 'increase',
    comparisonPeriod: 'vs last month',
    iconName: 'wallet',
    accentColor: 'blue',
  },
  {
    id: 'total-income',
    label: 'Total Income',
    amount: 145000,
    currency: 'INR',
    changePercentage: 5.2,
    changeType: 'increase',
    comparisonPeriod: 'vs last month',
    iconName: 'trending-up',
    accentColor: 'emerald',
  },
  {
    id: 'total-expenses',
    label: 'Total Expenses',
    amount: 68450,
    currency: 'INR',
    changePercentage: -3.1,
    changeType: 'decrease',
    comparisonPeriod: 'vs last month',
    iconName: 'trending-down',
    accentColor: 'rose',
  },
  {
    id: 'monthly-savings',
    label: 'Monthly Savings',
    amount: 76550,
    currency: 'INR',
    changePercentage: 14.8,
    changeType: 'increase',
    comparisonPeriod: '52.8% savings rate',
    iconName: 'piggy-bank',
    accentColor: 'emerald',
  },
];

export const mockMonthlyCashFlow: MonthlyCashFlow[] = [
  {
    month: 'May 2026',
    shortMonth: 'May',
    income: 120000,
    expense: 64000,
    savings: 56000,
  },
  {
    month: 'Jun 2026',
    shortMonth: 'Jun',
    income: 128000,
    expense: 71000,
    savings: 57000,
  },
  {
    month: 'Jul 2026',
    shortMonth: 'Jul',
    income: 125000,
    expense: 69500,
    savings: 55500,
  },
  {
    month: 'Aug 2026',
    shortMonth: 'Aug',
    income: 135000,
    expense: 74200,
    savings: 60800,
  },
  {
    month: 'Sep 2026',
    shortMonth: 'Sep',
    income: 138000,
    expense: 70600,
    savings: 67400,
  },
  {
    month: 'Oct 2026',
    shortMonth: 'Oct',
    income: 145000,
    expense: 68450,
    savings: 76550,
  },
];

export const mockCategoryExpenses: CategoryExpense[] = [
  {
    category: 'Housing & Rent',
    amount: 25000,
    percentage: 36.5,
    color: '#0F766E', // teal-700
  },
  {
    category: 'Food & Groceries',
    amount: 16500,
    percentage: 24.1,
    color: '#10B981', // emerald-500
  },
  {
    category: 'Shopping & Lifestyle',
    amount: 8250,
    percentage: 12.1,
    color: '#6366F1', // indigo-500
  },
  {
    category: 'Utilities & Bills',
    amount: 7400,
    percentage: 10.8,
    color: '#F59E0B', // amber-500
  },
  {
    category: 'Transportation',
    amount: 6800,
    percentage: 9.9,
    color: '#0284C7', // sky-600
  },
  {
    category: 'Healthcare & Wellness',
    amount: 4500,
    percentage: 6.6,
    color: '#EC4899', // pink-500
  },
];

export const mockRecentTransactions: Transaction[] = [
  {
    id: 'tx-001',
    description: 'TechCorp Solutions - Salary',
    category: 'Salary',
    date: '2026-10-28',
    amount: 115000,
    type: 'income',
    paymentMethod: 'Direct Deposit',
    status: 'completed',
  },
  {
    id: 'tx-002',
    description: 'GreenValley Fresh Supermarket',
    category: 'Groceries',
    date: '2026-10-27',
    amount: 4280,
    type: 'expense',
    paymentMethod: 'UPI Pay',
    status: 'completed',
  },
  {
    id: 'tx-003',
    description: 'Prestige Heights - Monthly Rent',
    category: 'Rent',
    date: '2026-10-25',
    amount: 25000,
    type: 'expense',
    paymentMethod: 'Net Banking',
    status: 'completed',
  },
  {
    id: 'tx-004',
    description: 'Apex Studio - Freelance UI Retainer',
    category: 'Freelance Income',
    date: '2026-10-24',
    amount: 30000,
    type: 'income',
    paymentMethod: 'NEFT Transfer',
    status: 'completed',
  },
  {
    id: 'tx-005',
    description: 'Metro Rail SmartCard Recharge',
    category: 'Transportation',
    date: '2026-10-22',
    amount: 1850,
    type: 'expense',
    paymentMethod: 'Debit Card',
    status: 'completed',
  },
  {
    id: 'tx-006',
    description: 'Urban Chic Studio - Wardrobe',
    category: 'Shopping',
    date: '2026-10-20',
    amount: 5490,
    type: 'expense',
    paymentMethod: 'Credit Card',
    status: 'completed',
  },
  {
    id: 'tx-007',
    description: 'PowerGrid Electricity & Gas Bill',
    category: 'Utilities',
    date: '2026-10-18',
    amount: 3240,
    type: 'expense',
    paymentMethod: 'Auto-Debit',
    status: 'completed',
  },
  {
    id: 'tx-008',
    description: 'FreshBite Organic Bistro',
    category: 'Food & Dining',
    date: '2026-10-16',
    amount: 2450,
    type: 'expense',
    paymentMethod: 'UPI Pay',
    status: 'completed',
  },
];

export const mockBudgetProgress: BudgetProgress[] = [
  {
    id: 'bgt-1',
    category: 'Housing & Rent',
    spent: 25000,
    allocated: 25000,
    color: '#0F766E', // teal-700
  },
  {
    id: 'bgt-2',
    category: 'Food & Groceries',
    spent: 16500,
    allocated: 20000,
    color: '#10B981', // emerald-500
  },
  {
    id: 'bgt-3',
    category: 'Shopping & Lifestyle',
    spent: 8250,
    allocated: 12000,
    color: '#6366F1', // indigo-500
  },
  {
    id: 'bgt-4',
    category: 'Utilities & Bills',
    spent: 7400,
    allocated: 9000,
    color: '#F59E0B', // amber-500
  },
  {
    id: 'bgt-5',
    category: 'Transportation',
    spent: 6800,
    allocated: 8000,
    color: '#0284C7', // sky-600
  },
];
