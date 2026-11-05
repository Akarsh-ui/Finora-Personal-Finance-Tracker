import User from '../models/User.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/token.js';
import { validateName, validateEmail, validatePassword } from '../utils/validation.js';

/**
 * POST /api/auth/signup
 * Register a new user with name, email, and password
 */
export async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body || {};

    // 1. Validate full name
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: nameValidation.message,
      });
    }

    // 2. Validate email address (universal provider support)
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.message,
      });
    }

    const normalizedEmail = emailValidation.sanitized;

    // Check for existing user (return 409 if email already registered)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.',
      });
    }

    // 3. Validate password complexity (8-64 chars, upper, lower, number, special char)
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
      });
    }

    // Create user (password is hashed by pre-save hook)
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    // Generate JWT token
    const token = generateToken(newUser);

    // Set secure HttpOnly cookie
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: newUser.toSafeObject(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. ') || 'Validation error while saving account.',
      });
    }
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Authenticate existing user with email and password
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
      });
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Password is required.',
      });
    }

    // Validate email format (allow numeric local part for existing accounts)
    const emailValidation = validateEmail(email, { allowNumericLocal: true });
    if (!emailValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: emailValidation.message,
      });
    }

    const normalizedEmail = emailValidation.sanitized;

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare candidate password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Set secure HttpOnly cookie
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Clear session cookie and invalidate client state
 */
export async function logout(req, res) {
  clearAuthCookie(res);
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
}

/**
 * GET /api/auth/me
 * Return current authenticated user profile
 */
export async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user.toSafeObject(),
  });
}
