export interface SummaryMetric {
  id: string;
  label: string;
  amount: number;
  currency: string;
  changePercentage: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  comparisonPeriod: string;
  iconName: 'wallet' | 'trending-up' | 'trending-down' | 'piggy-bank';
  accentColor: 'emerald' | 'blue' | 'rose' | 'amber';
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  _id?: string;
  title?: string;
  description: string;
  category: string;
  date: string; // ISO date string or formatted
  amount: number;
  type: TransactionType;
  paymentMethod?: string;
  notes?: string;
  status?: 'completed' | 'pending';
  createdAt?: string;
  updatedAt?: string;
}

export interface TransactionInput {
  title?: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  paymentMethod?: string;
  notes?: string;
  status?: 'completed' | 'pending';
}

export interface MonthlyCashFlow {
  month: string;
  shortMonth: string;
  income: number;
  expense: number;
  savings: number;
}

export interface CategoryExpense {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface BudgetProgress {
  id: string;
  category: string;
  spent: number;
  allocated: number;
  color: string;
}

export interface Budget {
  id: string;
  _id?: string;
  user?: string;
  category: string;
  monthlyLimit: number;
  month: number;
  year: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BudgetInput {
  category: string;
  monthlyLimit: number;
  month: number;
  year: number;
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  initials: string;
}

export type AnalyticsPeriod =
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_12_months'
  | 'this_year'
  | 'custom';

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface FinancialInsight {
  id: string;
  type: 'positive' | 'warning' | 'info';
  title: string;
  description: string;
  metricText?: string;
}

export interface AnalyticsSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  prevTotalIncome: number;
  prevTotalExpenses: number;
  prevNetSavings: number;
  incomeChangePct: number;
  expenseChangePct: number;
  netSavingsChangePct: number;
  transactionCount: number;
}

export interface AnalyticsData {
  hasData: boolean;
  period: {
    type: AnalyticsPeriod;
    startDate: string;
    endDate: string;
    prevStartDate: string;
    prevEndDate: string;
  };
  summary: AnalyticsSummary;
  expenseBreakdown: CategoryBreakdownItem[];
  incomeBreakdown: CategoryBreakdownItem[];
  top5Expenses: CategoryBreakdownItem[];
  highestExpenseCategory: CategoryBreakdownItem | null;
  highestIncomeCategory: CategoryBreakdownItem | null;
  monthlyTrends: MonthlyCashFlow[];
  insights: FinancialInsight[];
  transactions: Transaction[];
}

