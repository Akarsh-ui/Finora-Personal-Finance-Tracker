import mongoose from 'mongoose';
import Budget from '../models/Budget.js';
import { checkBudgetThresholds } from '../services/notification.service.js';
import { validateBudgetInput, MAX_AMOUNT } from '../utils/validation.js';

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * GET /api/budgets
 * Retrieve the logged-in user's budgets with optional month and year filtering
 */
export async function getBudgets(req, res, next) {
  try {
    const userId = req.user._id;
    const { month, year } = req.query;

    const filter = { user: userId };

    if (month !== undefined && month !== '') {
      const parsedMonth = parseInt(month, 10);
      if (!isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
        filter.month = parsedMonth;
      }
    }

    if (year !== undefined && year !== '') {
      const parsedYear = parseInt(year, 10);
      if (!isNaN(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100) {
        filter.year = parsedYear;
      }
    }

    const budgets = await Budget.find(filter).sort({ category: 1, month: -1, year: -1 });

    return res.status(200).json({
      success: true,
      count: budgets.length,
      budgets,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/budgets
 * Create a new monthly category budget for the authenticated user
 */
export async function createBudget(req, res, next) {
  try {
    const userId = req.user._id;
    const { category, monthlyLimit, month, year } = req.body || {};

    const validation = validateBudgetInput({ category, monthlyLimit, month, year });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const {
      category: trimmedCategory,
      monthlyLimit: parsedLimit,
      month: targetMonth,
      year: targetYear,
    } = validation.sanitized;

    // Check for existing budget for this user + category + month + year
    const escapedCat = trimmedCategory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await Budget.findOne({
      user: userId,
      category: new RegExp(`^${escapedCat}$`, 'i'),
      month: targetMonth,
      year: targetYear,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A budget for '${trimmedCategory}' already exists for ${targetMonth}/${targetYear}. Please edit the existing budget limit instead.`,
      });
    }

    const newBudget = await Budget.create({
      user: userId,
      category: trimmedCategory,
      monthlyLimit: parsedLimit,
      month: targetMonth,
      year: targetYear,
    });

    // Check if existing month expenses already reach warning or exceeded thresholds
    checkBudgetThresholds(
      userId,
      newBudget.category,
      new Date(newBudget.year, newBudget.month - 1, 1)
    ).catch((err) => console.warn('[Notification] Budget check error:', err.message));

    return res.status(201).json({
      success: true,
      message: 'Budget created successfully.',
      budget: newBudget,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A duplicate budget exists for this category and month.',
      });
    }
    next(error);
  }
}

/**
 * PUT /api/budgets/:id
 * Update an existing budget owned by the authenticated user
 */
export async function updateBudget(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid budget ID format.',
      });
    }

    const budget = await Budget.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found or unauthorized access.',
      });
    }

    const { category, monthlyLimit, month, year } = req.body || {};

    if (monthlyLimit !== undefined) {
      const parsedLimit = Number(monthlyLimit);
      if (isNaN(parsedLimit) || !Number.isFinite(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Monthly limit must be a positive number greater than 0.',
        });
      }
      if (parsedLimit > MAX_AMOUNT) {
        return res.status(400).json({
          success: false,
          message: `Monthly limit cannot exceed ₹${MAX_AMOUNT.toLocaleString('en-IN')}.`,
        });
      }
      budget.monthlyLimit = parsedLimit;
    }

    if (category !== undefined) {
      const trimmedCat = category.trim();
      if (!trimmedCat || trimmedCat.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Category is required (at least 2 characters).',
        });
      }
      if (trimmedCat.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot exceed 50 characters.',
        });
      }
      if (!/[a-zA-Z0-9]/.test(trimmedCat)) {
        return res.status(400).json({
          success: false,
          message: 'Category must contain letters or numbers.',
        });
      }
      budget.category = trimmedCat;
    }

    if (month !== undefined) {
      const m = parseInt(month, 10);
      if (isNaN(m) || m < 1 || m > 12) {
        return res.status(400).json({
          success: false,
          message: 'Month must be between 1 and 12.',
        });
      }
      budget.month = m;
    }

    if (year !== undefined) {
      const y = parseInt(year, 10);
      if (isNaN(y) || y < 2000 || y > 2100) {
        return res.status(400).json({
          success: false,
          message: 'Year must be between 2000 and 2100.',
        });
      }
      budget.year = y;
    }

    // Check duplicate if category, month, or year changed
    const escapedCat = budget.category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const duplicate = await Budget.findOne({
      _id: { $ne: budget._id },
      user: req.user._id,
      category: new RegExp(`^${escapedCat}$`, 'i'),
      month: budget.month,
      year: budget.year,
    });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `Another budget already exists for '${budget.category}' in ${budget.month}/${budget.year}.`,
      });
    }

    await budget.save();

    // Check if new limit triggers 80% warning or 100% exceeded alert
    checkBudgetThresholds(
      req.user._id,
      budget.category,
      new Date(budget.year, budget.month - 1, 1)
    ).catch((err) => console.warn('[Notification] Budget check error:', err.message));

    return res.status(200).json({
      success: true,
      message: 'Budget updated successfully.',
      budget,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Another budget already exists for this category, month, and year.',
      });
    }
    next(error);
  }
}

/**
 * DELETE /api/budgets/:id
 * Delete an existing budget owned by the authenticated user
 */
export async function deleteBudget(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid budget ID format.',
      });
    }

    const deleted = await Budget.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found or unauthorized access.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Budget deleted successfully.',
      deletedId: id,
    });
  } catch (error) {
    next(error);
  }
}
