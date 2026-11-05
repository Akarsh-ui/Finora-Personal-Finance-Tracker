import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import {
  notifyTransactionActivity,
  checkBudgetThresholds,
} from '../services/notification.service.js';
import { validateTransactionInput, MAX_AMOUNT } from '../utils/validation.js';

/**
 * Validate MongoDB ObjectId
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * GET /api/transactions
 * Fetch transactions belonging exclusively to the authenticated user with search, filtering, sorting & pagination
 */
export async function getTransactions(req, res, next) {
  try {
    const userId = req.user._id;

    const {
      search,
      type,
      category,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy,
      sortOrder,
      page,
      limit,
    } = req.query;

    const filter = { user: userId };

    // 1. Text Search across title, description, category, paymentMethod, and notes
    if (search && typeof search === 'string' && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(sanitized, 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { type: searchRegex },
        { paymentMethod: searchRegex },
        { notes: searchRegex },
      ];
    }

    // 2. Transaction Type Filter
    if (type && ['income', 'expense'].includes(type)) {
      filter.type = type;
    }

    // 3. Category Filter
    if (category && typeof category === 'string' && category.trim() && category !== 'all') {
      const sanitizedCat = category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.category = new RegExp(`^${sanitizedCat}$`, 'i');
    }

    // 4. Date Range Filtering
    if (startDate || endDate) {
      let start = null;
      let end = null;
      if (startDate) {
        start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid start date format.',
          });
        }
        start.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid end date format.',
          });
        }
        end.setHours(23, 59, 59, 999);
      }

      if (start && end && start.getTime() > end.getTime()) {
        return res.status(400).json({
          success: false,
          message: 'Start date cannot be after end date.',
        });
      }

      filter.date = {};
      if (start) filter.date.$gte = start;
      if (end) filter.date.$lte = end;
    }

    // 5. Amount Range Filtering
    let parsedMin = undefined;
    let parsedMax = undefined;
    if (minAmount !== undefined && minAmount !== '') {
      parsedMin = Number(minAmount);
      if (isNaN(parsedMin) || !Number.isFinite(parsedMin) || parsedMin < 0) {
        return res.status(400).json({
          success: false,
          message: 'Minimum amount must be a valid non-negative number.',
        });
      }
    }

    if (maxAmount !== undefined && maxAmount !== '') {
      parsedMax = Number(maxAmount);
      if (isNaN(parsedMax) || !Number.isFinite(parsedMax) || parsedMax < 0) {
        return res.status(400).json({
          success: false,
          message: 'Maximum amount must be a valid non-negative number.',
        });
      }
    }

    if (parsedMin !== undefined && parsedMax !== undefined && parsedMin > parsedMax) {
      return res.status(400).json({
        success: false,
        message: 'Minimum amount cannot be greater than maximum amount.',
      });
    }

    if (parsedMin !== undefined) {
      filter.amount = filter.amount || {};
      filter.amount.$gte = parsedMin;
    }
    if (parsedMax !== undefined) {
      filter.amount = filter.amount || {};
      filter.amount.$lte = parsedMax;
    }

    // 6. Sorting Configuration
    const sortField = sortBy === 'amount' ? 'amount' : 'date';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortDirection };

    if (sortField !== 'date') {
      sortObj.date = -1;
    }
    sortObj.createdAt = -1;

    // 7. Pagination & Query Execution
    const total = await Transaction.countDocuments(filter);

    let query = Transaction.find(filter).sort(sortObj);

    if (page !== undefined && page !== '') {
      const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
      const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 200);
      const skip = (parsedPage - 1) * pageSize;

      const transactions = await query.skip(skip).limit(pageSize);

      return res.status(200).json({
        success: true,
        count: transactions.length,
        total,
        page: parsedPage,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        pageSize,
        transactions,
      });
    }

    // Default unpaginated query (with safe upper boundary)
    const maxLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500) : 500;
    const transactions = await query.limit(maxLimit);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      transactions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/transactions
 * Create a new transaction for the authenticated user
 */
export async function createTransaction(req, res, next) {
  try {
    const userId = req.user._id;
    const { title, description, amount, type, category, date, paymentMethod, notes, status } = req.body || {};

    const validation = validateTransactionInput({
      title: (title || description || '').trim(),
      description: (description || title || '').trim(),
      amount,
      type,
      category,
      date,
      notes,
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const {
      title: sanitizedTitle,
      description: sanitizedDesc,
      amount: parsedAmount,
      category: transactionCategory,
      date: transactionDate,
      notes: sanitizedNotes,
    } = validation.sanitized;

    const newTransaction = await Transaction.create({
      user: userId,
      title: sanitizedTitle,
      description: sanitizedDesc,
      amount: parsedAmount,
      type,
      category: transactionCategory,
      date: transactionDate,
      paymentMethod: (paymentMethod || 'UPI Pay').trim(),
      notes: sanitizedNotes,
      status: status === 'pending' ? 'pending' : 'completed',
    });

    // Trigger asynchronous notifications based on user preferences
    notifyTransactionActivity(userId, 'created', newTransaction).catch((err) =>
      console.warn('[Notification] Activity error:', err.message)
    );
    if (newTransaction.type === 'expense') {
      checkBudgetThresholds(userId, newTransaction.category, newTransaction.date).catch((err) =>
        console.warn('[Notification] Threshold error:', err.message)
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Transaction created successfully.',
      transaction: newTransaction,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/transactions/:id
 * Retrieve a single transaction owned by the authenticated user
 */
export async function getTransactionById(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format.',
      });
    }

    const transaction = await Transaction.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or unauthorized access.',
      });
    }

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/transactions/:id
 * Update an existing transaction owned by the authenticated user
 */
export async function updateTransaction(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format.',
      });
    }

    const existingTransaction = await Transaction.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or unauthorized access.',
      });
    }

    const { title, description, amount, type, category, date, paymentMethod, notes, status } = req.body || {};

    // Validate updates if provided
    if (description !== undefined || title !== undefined) {
      const desc = (description || title || '').trim();
      if (!desc) {
        return res.status(400).json({
          success: false,
          message: 'Transaction title is required.',
        });
      }
      if (desc.length < 2 || desc.length > 80) {
        return res.status(400).json({
          success: false,
          message: 'Transaction title must be between 2 and 80 characters.',
        });
      }
      if (!/[a-zA-Z0-9]/.test(desc)) {
        return res.status(400).json({
          success: false,
          message: 'Transaction title must contain letters or numbers.',
        });
      }
      existingTransaction.description = desc;
      existingTransaction.title = desc;
    }

    if (type !== undefined) {
      if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Type must be either 'income' or 'expense'.",
        });
      }
      existingTransaction.type = type;
    }

    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive finite number greater than 0.',
        });
      }
      if (parsedAmount > MAX_AMOUNT) {
        return res.status(400).json({
          success: false,
          message: `Amount cannot exceed ₹${MAX_AMOUNT.toLocaleString('en-IN')}.`,
        });
      }
      existingTransaction.amount = parsedAmount;
    }

    if (category !== undefined) {
      const cat = (category || '').trim();
      if (!cat || cat.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Category is required (at least 2 characters).',
        });
      }
      if (cat.length > 60) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot exceed 60 characters.',
        });
      }
      existingTransaction.category = cat;
    }

    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction date format.',
        });
      }
      const tenYearsFuture = new Date();
      tenYearsFuture.setFullYear(tenYearsFuture.getFullYear() + 10);
      if (parsedDate > tenYearsFuture) {
        return res.status(400).json({
          success: false,
          message: 'Transaction date cannot be more than 10 years in the future.',
        });
      }
      existingTransaction.date = parsedDate;
    }

    if (paymentMethod !== undefined) {
      existingTransaction.paymentMethod = paymentMethod.trim();
    }

    if (notes !== undefined) {
      const trimmedNotes = notes.trim();
      if (trimmedNotes.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Notes cannot exceed 500 characters.',
        });
      }
      existingTransaction.notes = trimmedNotes;
    }

    if (status !== undefined) {
      if (['completed', 'pending'].includes(status)) {
        existingTransaction.status = status;
      }
    }

    await existingTransaction.save();

    // Trigger asynchronous notifications based on user preferences
    notifyTransactionActivity(req.user._id, 'updated', existingTransaction).catch((err) =>
      console.warn('[Notification] Update activity error:', err.message)
    );
    if (existingTransaction.type === 'expense') {
      checkBudgetThresholds(req.user._id, existingTransaction.category, existingTransaction.date).catch((err) =>
        console.warn('[Notification] Threshold error:', err.message)
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction updated successfully.',
      transaction: existingTransaction,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/transactions/:id
 * Delete an existing transaction owned by the authenticated user
 */
export async function deleteTransaction(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format.',
      });
    }

    const deleted = await Transaction.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or unauthorized access.',
      });
    }

    // Trigger asynchronous activity notification
    notifyTransactionActivity(req.user._id, 'deleted', deleted).catch((err) =>
      console.warn('[Notification] Delete activity error:', err.message)
    );
    if (deleted.type === 'expense') {
      checkBudgetThresholds(req.user._id, deleted.category, deleted.date).catch((err) =>
        console.warn('[Notification] Threshold error:', err.message)
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully.',
      deletedId: id,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/transactions/analytics
 * Advanced aggregation and reporting metrics scoped to authenticated user
 */
export async function getTransactionAnalytics(req, res, next) {
  try {
    const userId = req.user._id;
    const { period = 'last_6_months', startDate, endDate } = req.query;

    const now = new Date();
    let start;
    let end;

    switch (period) {
      case 'this_month': {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
      case 'last_month': {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      }
      case 'last_3_months': {
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
      case 'last_6_months': {
        start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
      case 'last_12_months': {
        start = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
      case 'this_year': {
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      }
      case 'custom':
      default: {
        if (startDate) {
          start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
        } else {
          start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
        }

        if (endDate) {
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
        } else {
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }
        break;
      }
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date boundaries provided.',
      });
    }

    if (start.getTime() > end.getTime()) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date.',
      });
    }

    // Previous equivalent comparison window
    const durationMs = end.getTime() - start.getTime() + 1;
    const prevStart = new Date(start.getTime() - durationMs);
    const prevEnd = new Date(start.getTime() - 1);

    // Fetch transactions in current and previous windows
    const [currentTransactions, prevTransactions] = await Promise.all([
      Transaction.find({
        user: userId,
        date: { $gte: start, $lte: end },
      }).sort({ date: -1 }),
      Transaction.find({
        user: userId,
        date: { $gte: prevStart, $lte: prevEnd },
      }),
    ]);

    // 1. Current Window Totals
    let totalIncome = 0;
    let totalExpenses = 0;
    const expenseCategoryMap = {};
    const incomeCategoryMap = {};

    for (const tx of currentTransactions) {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        totalIncome += amt;
        const cat = (tx.category || 'Other').trim();
        incomeCategoryMap[cat] = (incomeCategoryMap[cat] || 0) + amt;
      } else if (tx.type === 'expense') {
        totalExpenses += amt;
        const cat = (tx.category || 'Other').trim();
        expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + amt;
      }
    }

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Number(((netSavings / totalIncome) * 100).toFixed(1)) : 0;

    // 2. Previous Window Totals
    let prevTotalIncome = 0;
    let prevTotalExpenses = 0;
    const prevExpenseCatMap = {};

    for (const tx of prevTransactions) {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        prevTotalIncome += amt;
      } else if (tx.type === 'expense') {
        prevTotalExpenses += amt;
        const cat = (tx.category || 'Other').trim();
        prevExpenseCatMap[cat] = (prevExpenseCatMap[cat] || 0) + amt;
      }
    }

    const prevNetSavings = prevTotalIncome - prevTotalExpenses;

    const incomeChangePct =
      prevTotalIncome > 0
        ? Number((((totalIncome - prevTotalIncome) / prevTotalIncome) * 100).toFixed(1))
        : totalIncome > 0
        ? 100
        : 0;

    const expenseChangePct =
      prevTotalExpenses > 0
        ? Number((((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100).toFixed(1))
        : totalExpenses > 0
        ? 100
        : 0;

    const netSavingsChangePct =
      prevNetSavings !== 0
        ? Number((((netSavings - prevNetSavings) / Math.abs(prevNetSavings)) * 100).toFixed(1))
        : 0;

    // 3. Category Breakdowns
    const CATEGORY_COLORS = {
      'Housing & Rent': '#0F766E',
      'Rent': '#0F766E',
      'Food & Groceries': '#10B981',
      'Groceries': '#10B981',
      'Food & Dining': '#14B8A6',
      'Dining Out': '#14B8A6',
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

    const expenseBreakdown = Object.entries(expenseCategoryMap)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalExpenses > 0 ? Number(((amt / totalExpenses) * 100).toFixed(1)) : 0,
        color: CATEGORY_COLORS[cat] || '#64748B',
      }))
      .sort((a, b) => b.amount - a.amount);

    const incomeBreakdown = Object.entries(incomeCategoryMap)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalIncome > 0 ? Number(((amt / totalIncome) * 100).toFixed(1)) : 0,
        color: CATEGORY_COLORS[cat] || '#059669',
      }))
      .sort((a, b) => b.amount - a.amount);

    const top5Expenses = expenseBreakdown.slice(0, 5);
    const highestExpenseCategory = expenseBreakdown[0] || null;
    const highestIncomeCategory = incomeBreakdown[0] || null;

    // 4. Monthly Trend Aggregation within range
    // Group transactions by month
    const monthBuckets = {};
    const dIter = new Date(start);
    dIter.setDate(1);
    while (dIter <= end) {
      const key = `${dIter.getFullYear()}-${String(dIter.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = dIter.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      const shortMonth = dIter.toLocaleString('en-US', { month: 'short' });
      monthBuckets[key] = {
        key,
        month: monthLabel,
        shortMonth,
        income: 0,
        expense: 0,
        savings: 0,
      };
      dIter.setMonth(dIter.getMonth() + 1);
    }

    for (const tx of currentTransactions) {
      const txD = new Date(tx.date);
      const key = `${txD.getFullYear()}-${String(txD.getMonth() + 1).padStart(2, '0')}`;
      if (monthBuckets[key]) {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'income') monthBuckets[key].income += amt;
        if (tx.type === 'expense') monthBuckets[key].expense += amt;
        monthBuckets[key].savings = monthBuckets[key].income - monthBuckets[key].expense;
      }
    }

    const monthlyTrends = Object.values(monthBuckets);

    // 5. Rule-Based Financial Insights
    const insights = [];
    const hasData = currentTransactions.length > 0;

    if (hasData) {
      // Insight 1: Spending comparison
      if (prevTotalExpenses > 0) {
        if (expenseChangePct > 0) {
          insights.push({
            id: 'spending-change',
            type: 'warning',
            title: 'Spending Increased',
            description: `Total expenses increased by ${expenseChangePct}% (₹${(totalExpenses - prevTotalExpenses).toLocaleString('en-IN')}) compared to the previous period.`,
            metricText: `+${expenseChangePct}%`,
          });
        } else if (expenseChangePct < 0) {
          insights.push({
            id: 'spending-change',
            type: 'positive',
            title: 'Spending Reduced',
            description: `Total expenses decreased by ${Math.abs(expenseChangePct)}% (₹${Math.abs(totalExpenses - prevTotalExpenses).toLocaleString('en-IN')}) compared to the previous period.`,
            metricText: `${expenseChangePct}%`,
          });
        }
      }

      // Insight 2: Savings Rate discipline
      if (totalIncome > 0) {
        if (savingsRate >= 30) {
          insights.push({
            id: 'savings-rate',
            type: 'positive',
            title: 'Strong Savings Discipline',
            description: `You maintained a healthy savings rate of ${savingsRate}%, retaining ₹${netSavings.toLocaleString('en-IN')} of your total income.`,
            metricText: `${savingsRate}%`,
          });
        } else if (savingsRate > 0) {
          insights.push({
            id: 'savings-rate',
            type: 'info',
            title: 'Positive Savings Rate',
            description: `You saved ${savingsRate}% of your income. Aiming for above 20% accelerates your financial runway.`,
            metricText: `${savingsRate}%`,
          });
        } else {
          insights.push({
            id: 'savings-rate',
            type: 'warning',
            title: 'Outflows Exceeded Inflow',
            description: `Your spending exceeded your income by ₹${Math.abs(netSavings).toLocaleString('en-IN')}, resulting in a negative savings rate of ${savingsRate}%.`,
            metricText: `${savingsRate}%`,
          });
        }
      } else if (totalExpenses > 0) {
        insights.push({
          id: 'no-income',
          type: 'warning',
          title: 'No Inflows Recorded',
          description: `Total spending was ₹${totalExpenses.toLocaleString('en-IN')} with no recorded income for this period.`,
          metricText: '₹0 income',
        });
      }

      // Insight 3: Highest spending category
      if (highestExpenseCategory) {
        insights.push({
          id: 'highest-expense',
          type: highestExpenseCategory.percentage > 40 ? 'warning' : 'info',
          title: 'Top Spending Category',
          description: `${highestExpenseCategory.category} represents your largest outflow at ₹${highestExpenseCategory.amount.toLocaleString('en-IN')} (${highestExpenseCategory.percentage}% of all expenses).`,
          metricText: `${highestExpenseCategory.percentage}%`,
        });
      }

      // Insight 4: Highest income source
      if (highestIncomeCategory) {
        insights.push({
          id: 'highest-income',
          type: 'positive',
          title: 'Primary Income Stream',
          description: `${highestIncomeCategory.category} is your primary revenue source, bringing in ₹${highestIncomeCategory.amount.toLocaleString('en-IN')} (${highestIncomeCategory.percentage}% of total income).`,
          metricText: `${highestIncomeCategory.percentage}%`,
        });
      }

      // Insight 5: Category spending acceleration
      let largestGrowthCat = null;
      let largestGrowthAmt = 0;
      for (const [cat, curAmt] of Object.entries(expenseCategoryMap)) {
        const prevAmt = prevExpenseCatMap[cat] || 0;
        const diff = curAmt - prevAmt;
        if (diff > largestGrowthAmt && prevAmt > 0) {
          largestGrowthAmt = diff;
          largestGrowthCat = { category: cat, diff, curAmt, prevAmt };
        }
      }

      if (largestGrowthCat) {
        const growthPct = Number(((largestGrowthCat.diff / largestGrowthCat.prevAmt) * 100).toFixed(1));
        insights.push({
          id: 'category-growth',
          type: 'warning',
          title: 'Category Outflow Spike',
          description: `Spending in ${largestGrowthCat.category} grew by ${growthPct}% (+₹${largestGrowthCat.diff.toLocaleString('en-IN')}) compared to the prior period.`,
          metricText: `+${growthPct}%`,
        });
      }
    }

    return res.status(200).json({
      success: true,
      hasData,
      period: {
        type: period,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        prevStartDate: prevStart.toISOString(),
        prevEndDate: prevEnd.toISOString(),
      },
      summary: {
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate,
        prevTotalIncome,
        prevTotalExpenses,
        prevNetSavings,
        incomeChangePct,
        expenseChangePct,
        netSavingsChangePct,
        transactionCount: currentTransactions.length,
      },
      expenseBreakdown,
      incomeBreakdown,
      top5Expenses,
      highestExpenseCategory,
      highestIncomeCategory,
      monthlyTrends,
      insights,
      transactions: currentTransactions,
    });
  } catch (error) {
    next(error);
  }
}

