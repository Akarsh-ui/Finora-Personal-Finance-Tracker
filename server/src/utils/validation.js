/**
 * Finora Server Validation Utilities
 * Centralized, production-grade validation logic and logical restrictions
 */

export const MAX_EMAIL_LENGTH = 254;
export const MAX_AMOUNT = 100000000; // 100,000,000 (100 million)

// RFC 5322 compliant robust email regex allowing all legitimate providers and domains
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Name allows letters and spaces only, 2-50 chars
export const NAME_REGEX = /^[a-zA-Z\s]+$/;

// Special character check for password complexity
export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

/**
 * Validate full name
 * @param {string} name
 * @returns {{ isValid: boolean, message?: string, sanitized?: string }}
 */
export function validateName(name) {
  if (name === undefined || name === null || typeof name !== 'string') {
    return { isValid: false, message: 'Name is required.' };
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { isValid: false, message: 'Name is required.' };
  }
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { isValid: false, message: 'Name must be between 2 and 50 characters.' };
  }
  if (!NAME_REGEX.test(trimmed)) {
    return { isValid: false, message: 'Name must contain only letters and spaces.' };
  }
  // Ensure not just spaces or empty letters
  const lettersOnly = trimmed.replace(/\s+/g, '');
  if (lettersOnly.length < 2) {
    return { isValid: false, message: 'Name must contain at least 2 letters.' };
  }
  return { isValid: true, sanitized: trimmed };
}

/**
 * Validate email address across all providers (Gmail, Outlook, Yahoo, Hotmail, custom domains)
 * @param {string} email
 * @param {{ allowNumericLocal?: boolean }} [options]
 * @returns {{ isValid: boolean, message?: string, sanitized?: string }}
 */
export function validateEmail(email, { allowNumericLocal = false } = {}) {
  if (email === undefined || email === null || typeof email !== 'string') {
    return { isValid: false, message: 'Email address is required.' };
  }
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return { isValid: false, message: 'Email address is required.' };
  }
  if (/\s/.test(trimmed)) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    return { isValid: false, message: `Email address cannot exceed ${MAX_EMAIL_LENGTH} characters.` };
  }

  // Must have exactly one @ symbol
  const atIndex = trimmed.indexOf('@');
  const lastAtIndex = trimmed.lastIndexOf('@');
  if (atIndex === -1 || atIndex !== lastAtIndex) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }

  const localPart = trimmed.substring(0, atIndex);
  const domainPart = trimmed.substring(atIndex + 1);

  if (!localPart || !domainPart) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }

  // Local part checks
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }

  const LOCAL_PART_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  if (!LOCAL_PART_REGEX.test(localPart)) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }

  // Require at least one alphabetic character before @ (e.g. 123@gmail.com is invalid, akarsh123@gmail.com is valid)
  // allowNumericLocal allows existing accounts to log in without lockout
  if (!allowNumericLocal && !/[a-zA-Z]/.test(localPart)) {
    return { isValid: false, message: 'Email address must contain at least one letter before @.' };
  }

  // Domain structure checks
  if (!domainPart.includes('.') || domainPart.startsWith('.') || domainPart.endsWith('.') || domainPart.includes('..')) {
    return { isValid: false, message: 'Please enter a valid email domain.' };
  }

  const domainLabels = domainPart.split('.');
  if (domainLabels.length < 2) {
    return { isValid: false, message: 'Please enter a valid email domain.' };
  }

  for (const label of domainLabels) {
    if (!label || label.startsWith('-') || label.endsWith('-') || !/^[a-zA-Z0-9-]+$/.test(label)) {
      return { isValid: false, message: 'Please enter a valid email domain.' };
    }
  }

  const tld = domainLabels[domainLabels.length - 1];
  if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    return { isValid: false, message: 'Please enter a valid email domain.' };
  }

  return { isValid: true, sanitized: trimmed.toLowerCase() };
}

/**
 * Validate password complexity for new registrations and password change
 * @param {string} password
 * @returns {{ isValid: boolean, message?: string, checks: { minLength: boolean, hasUpper: boolean, hasLower: boolean, hasNumber: boolean, hasSpecial: boolean } }}
 */
export function validatePassword(password) {
  const checks = {
    minLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
  };

  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required.', checks };
  }

  checks.minLength = password.length >= 8 && password.length <= 64;
  checks.hasUpper = /[A-Z]/.test(password);
  checks.hasLower = /[a-z]/.test(password);
  checks.hasNumber = /[0-9]/.test(password);
  checks.hasSpecial = SPECIAL_CHAR_REGEX.test(password);

  if (password.trim().length === 0) {
    return { isValid: false, message: 'Password cannot consist entirely of spaces.', checks };
  }

  if (password.length < 8 || password.length > 64) {
    return { isValid: false, message: 'Password must be between 8 and 64 characters.', checks };
  }

  if (!checks.hasUpper || !checks.hasLower || !checks.hasNumber || !checks.hasSpecial) {
    return {
      isValid: false,
      message: 'Password must include at least one uppercase letter, one lowercase letter, one number and one special character.',
      checks,
    };
  }

  return { isValid: true, checks };
}

/**
 * Validate transaction fields
 * @param {object} param0
 */
export function validateTransactionInput({ title, description, amount, type, category, date, notes }) {
  // Title / Description
  const rawTitle = (title || description || '').trim();
  if (!rawTitle) {
    return { isValid: false, message: 'Transaction title is required.' };
  }
  if (rawTitle.length < 2 || rawTitle.length > 80) {
    return { isValid: false, message: 'Transaction title must be between 2 and 80 characters.' };
  }
  // Must contain letters or numbers, cannot be purely symbols or whitespace
  if (!/[a-zA-Z0-9]/.test(rawTitle)) {
    return { isValid: false, message: 'Transaction title must contain letters or numbers.' };
  }

  // Type
  if (!type || !['income', 'expense'].includes(type)) {
    return { isValid: false, message: "Transaction type must be either 'income' or 'expense'." };
  }

  // Amount
  const parsedAmount = Number(amount);
  if (amount === undefined || amount === null || isNaN(parsedAmount) || !Number.isFinite(parsedAmount)) {
    return { isValid: false, message: 'Amount is required and must be a valid number.' };
  }
  if (parsedAmount <= 0) {
    return { isValid: false, message: 'Amount must be greater than 0.' };
  }
  if (parsedAmount > MAX_AMOUNT) {
    return { isValid: false, message: `Amount cannot exceed ₹${MAX_AMOUNT.toLocaleString('en-IN')}.` };
  }

  // Category
  const trimmedCat = (category || '').trim();
  if (!trimmedCat || trimmedCat.length < 2) {
    return { isValid: false, message: 'Transaction category is required (at least 2 characters).' };
  }
  if (trimmedCat.length > 60) {
    return { isValid: false, message: 'Category cannot exceed 60 characters.' };
  }

  // Date
  let parsedDate = new Date();
  if (date) {
    parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return { isValid: false, message: 'Date is required and must be a valid date.' };
    }
    // Prevent extreme future dates (e.g. beyond 10 years in the future)
    const tenYearsFuture = new Date();
    tenYearsFuture.setFullYear(tenYearsFuture.getFullYear() + 10);
    if (parsedDate > tenYearsFuture) {
      return { isValid: false, message: 'Transaction date cannot be more than 10 years in the future.' };
    }
  }

  // Notes
  const trimmedNotes = (notes || '').trim();
  if (trimmedNotes.length > 500) {
    return { isValid: false, message: 'Notes cannot exceed 500 characters.' };
  }

  return {
    isValid: true,
    sanitized: {
      title: rawTitle,
      description: rawTitle,
      amount: parsedAmount,
      type,
      category: trimmedCat,
      date: parsedDate,
      notes: trimmedNotes,
    },
  };
}

/**
 * Validate budget input
 * @param {object} param0
 */
export function validateBudgetInput({ category, monthlyLimit, month, year }) {
  const trimmedCategory = (category || '').trim();
  if (!trimmedCategory) {
    return { isValid: false, message: 'Budget category is required.' };
  }
  if (trimmedCategory.length < 2 || trimmedCategory.length > 50) {
    return { isValid: false, message: 'Category must be between 2 and 50 characters.' };
  }
  if (!/[a-zA-Z0-9]/.test(trimmedCategory)) {
    return { isValid: false, message: 'Category must contain letters or numbers.' };
  }

  const parsedLimit = Number(monthlyLimit);
  if (monthlyLimit === undefined || monthlyLimit === null || isNaN(parsedLimit) || !Number.isFinite(parsedLimit)) {
    return { isValid: false, message: 'Monthly limit is required and must be a valid number.' };
  }
  if (parsedLimit <= 0) {
    return { isValid: false, message: 'Monthly limit must be a positive number greater than 0.' };
  }
  if (parsedLimit > MAX_AMOUNT) {
    return { isValid: false, message: `Monthly limit cannot exceed ₹${MAX_AMOUNT.toLocaleString('en-IN')}.` };
  }

  const now = new Date();
  const targetMonth = month !== undefined ? parseInt(month, 10) : now.getMonth() + 1;
  const targetYear = year !== undefined ? parseInt(year, 10) : now.getFullYear();

  if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
    return { isValid: false, message: 'Month must be an integer between 1 and 12.' };
  }
  if (isNaN(targetYear) || targetYear < 2000 || targetYear > 2100) {
    return { isValid: false, message: 'Year must be between 2000 and 2100.' };
  }

  return {
    isValid: true,
    sanitized: {
      category: trimmedCategory,
      monthlyLimit: parsedLimit,
      month: targetMonth,
      year: targetYear,
    },
  };
}
