import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';

/**
 * Create a new notification if user preferences allow it
 */
export async function createNotification(userId, {
  title,
  message,
  type,
  relatedEntityId = null,
  relatedEntityType = null,
  deduplicationKey = null,
}) {
  try {
    if (!userId) return null;

    // Check user notification preferences
    const user = await User.findById(userId).select('notifications');
    if (!user) return null;

    const prefs = user.notifications || {
      budgetThresholdAlerts: true,
      budgetExceededAlerts: true,
      transactionActivityAlerts: true,
      monthlySummaryAlerts: true,
    };

    // Enforce preferences
    if (type === 'budget_warning' && prefs.budgetThresholdAlerts === false) {
      return null;
    }
    if (type === 'budget_exceeded' && prefs.budgetExceededAlerts === false) {
      return null;
    }
    if (type === 'transaction_activity' && prefs.transactionActivityAlerts === false) {
      return null;
    }
    if (type === 'monthly_summary' && prefs.monthlySummaryAlerts === false) {
      return null;
    }

    // Check if deduplication key already exists for this user
    if (deduplicationKey) {
      const existing = await Notification.findOne({
        user: userId,
        deduplicationKey,
      });
      if (existing) {
        return null;
      }
    }

    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      relatedEntityId: relatedEntityId ? String(relatedEntityId) : null,
      relatedEntityType,
      deduplicationKey,
    });

    return notification;
  } catch (error) {
    // Handle duplicate key error gracefully
    if (error.code === 11000) {
      return null;
    }
    console.error('[NotificationService] Error creating notification:', error.message);
    return null;
  }
}

/**
 * Check budget utilization for category/month and dispatch alerts
 */
export async function checkBudgetThresholds(userId, category, date) {
  try {
    if (!userId || !category) return;

    const targetDate = date ? new Date(date) : new Date();
    const month = targetDate.getMonth() + 1;
    const year = targetDate.getFullYear();

    // Find active budget for this category and month
    const budget = await Budget.findOne({
      user: userId,
      category: { $regex: new RegExp(`^${category.trim()}$`, 'i') },
      month,
      year,
    });

    if (!budget || !budget.monthlyLimit || budget.monthlyLimit <= 0) {
      return;
    }

    // Calculate actual total spent in this month for this category
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const expenseAgg = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          category: { $regex: new RegExp(`^${category.trim()}$`, 'i') },
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' },
        },
      },
    ]);

    const totalSpent = expenseAgg.length > 0 ? expenseAgg[0].totalSpent : 0;
    const utilizationPct = (totalSpent / budget.monthlyLimit) * 100;

    // Check 100%+ Exceeded Alert
    if (utilizationPct >= 100) {
      const overAmount = totalSpent - budget.monthlyLimit;
      await createNotification(userId, {
        title: `Budget Exceeded: ${budget.category}`,
        message: `You have spent ₹${totalSpent.toLocaleString('en-IN')} of your ₹${budget.monthlyLimit.toLocaleString('en-IN')} limit for ${budget.category} (${utilizationPct.toFixed(0)}% utilized, over by ₹${overAmount.toLocaleString('en-IN')}).`,
        type: 'budget_exceeded',
        relatedEntityId: budget._id,
        relatedEntityType: 'budget',
        deduplicationKey: `budget_exceeded_${budget._id}_${year}_${month}`,
      });
    }
    // Check 80%+ Warning Alert
    else if (utilizationPct >= 80) {
      await createNotification(userId, {
        title: `Budget Alert: ${budget.category}`,
        message: `You have reached ${utilizationPct.toFixed(0)}% of your monthly ₹${budget.monthlyLimit.toLocaleString('en-IN')} budget for ${budget.category} (Spent: ₹${totalSpent.toLocaleString('en-IN')}).`,
        type: 'budget_warning',
        relatedEntityId: budget._id,
        relatedEntityType: 'budget',
        deduplicationKey: `budget_threshold_${budget._id}_${year}_${month}`,
      });
    }
  } catch (error) {
    console.error('[NotificationService] Error checking budget thresholds:', error.message);
  }
}

/**
 * Log transaction activity (create, update, delete)
 */
export async function notifyTransactionActivity(userId, action, transaction) {
  try {
    if (!userId || !transaction) return;

    const actionWord = action === 'created' ? 'logged' : action === 'updated' ? 'modified' : 'removed';
    const typeLabel = transaction.type === 'income' ? 'Income' : 'Expense';
    const amountStr = `₹${Number(transaction.amount || 0).toLocaleString('en-IN')}`;
    const desc = transaction.description || transaction.title || transaction.category;

    await createNotification(userId, {
      title: `Transaction ${action === 'created' ? 'Added' : action === 'updated' ? 'Updated' : 'Deleted'}`,
      message: `${typeLabel} of ${amountStr} for "${desc}" was successfully ${actionWord}.`,
      type: 'transaction_activity',
      relatedEntityId: transaction._id ? String(transaction._id) : null,
      relatedEntityType: 'transaction',
    });
  } catch (error) {
    console.error('[NotificationService] Error logging transaction activity:', error.message);
  }
}
