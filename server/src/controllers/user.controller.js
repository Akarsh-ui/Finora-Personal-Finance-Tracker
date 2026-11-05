import User from '../models/User.js';
import { generateToken, setAuthCookie } from '../utils/token.js';
import { validateName, validateEmail, validatePassword } from '../utils/validation.js';

const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

/**
 * GET /api/users/profile
 * Retrieve authenticated user profile, preferences, and account metadata
 */
export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/users/profile
 * Update authenticated user full name and/or email address
 */
export async function updateProfile(req, res, next) {
  try {
    const { name, email } = req.body || {};

    if (name === undefined && email === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a name or email address to update.',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    // Validate and update name
    if (name !== undefined) {
      const nameValidation = validateName(name);
      if (!nameValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: nameValidation.message,
        });
      }
      user.name = nameValidation.sanitized;
    }

    let emailChanged = false;
    // Validate and update email
    if (email !== undefined) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: emailValidation.message,
        });
      }

      const normalizedEmail = emailValidation.sanitized;

      if (normalizedEmail !== user.email) {
        // Prevent duplicate email addresses
        const existing = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: user._id },
        });

        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'This email address is already in use by another account.',
          });
        }

        user.email = normalizedEmail;
        emailChanged = true;
      }
    }

    await user.save();

    // Re-issue JWT token if email changed so claims remain synchronized
    let newToken = null;
    if (emailChanged) {
      newToken = generateToken(user);
      setAuthCookie(res, newToken);
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: user.toSafeObject(),
      ...(newToken ? { token: newToken } : {}),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/users/password
 * Change authenticated user password with current password verification
 */
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Current password is required.',
      });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'New password is required.',
      });
    }

    if (!confirmPassword || typeof confirmPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation password is required.',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation password do not match.',
      });
    }

    // Validate new password complexity
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
      });
    }

    // Retrieve user including password hash
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Prevent re-using the exact same password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password.',
      });
    }

    // Set new password (pre-save hook hashes it)
    user.password = newPassword;
    await user.save();

    // Invalidate old session claims by issuing a fresh token
    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
      token,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/users/preferences
 * Update currency and notification preferences
 */
export async function updatePreferences(req, res, next) {
  try {
    const { currency, notifications } = req.body || {};

    if (currency === undefined && notifications === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide currency or notification preferences to update.',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    // Validate currency
    if (currency !== undefined) {
      if (!SUPPORTED_CURRENCIES.includes(currency)) {
        return res.status(400).json({
          success: false,
          message: `Invalid currency "${currency}". Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}.`,
        });
      }
      user.currency = currency;
    }

    // Validate and update notifications
    if (notifications !== undefined) {
      if (typeof notifications !== 'object' || notifications === null) {
        return res.status(400).json({
          success: false,
          message: 'Notification preferences must be an object.',
        });
      }

      if (!user.notifications) {
        user.notifications = {};
      }

      if (typeof notifications.budgetThresholdAlerts === 'boolean') {
        user.notifications.budgetThresholdAlerts = notifications.budgetThresholdAlerts;
      }
      if (typeof notifications.budgetExceededAlerts === 'boolean') {
        user.notifications.budgetExceededAlerts = notifications.budgetExceededAlerts;
      }
      if (typeof notifications.transactionActivityAlerts === 'boolean') {
        user.notifications.transactionActivityAlerts = notifications.transactionActivityAlerts;
      }
      if (typeof notifications.monthlySummaryAlerts === 'boolean') {
        user.notifications.monthlySummaryAlerts = notifications.monthlySummaryAlerts;
      }
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Preferences saved successfully.',
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
}
