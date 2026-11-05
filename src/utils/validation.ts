/**
 * Finora Frontend Validation Utilities
 * Matching rules with server-side validation to provide instant inline warnings and feedback
 */

export const MAX_EMAIL_LENGTH = 254;
export const MAX_AMOUNT = 100000000; // 100,000,000 (100 million)

export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
export const NAME_REGEX = /^[a-zA-Z\s]+$/;
export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  sanitized?: string;
}

export interface PasswordChecks {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function validateName(name: string): ValidationResult {
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
  const lettersOnly = trimmed.replace(/\s+/g, '');
  if (lettersOnly.length < 2) {
    return { isValid: false, message: 'Name must contain at least 2 letters.' };
  }
  return { isValid: true, sanitized: trimmed };
}

export function validateEmail(
  email: string,
  options: { allowNumericLocal?: boolean } = {}
): ValidationResult {
  const { allowNumericLocal = false } = options;
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

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: Boolean(password && password.length >= 8 && password.length <= 64),
    hasUpper: Boolean(password && /[A-Z]/.test(password)),
    hasLower: Boolean(password && /[a-z]/.test(password)),
    hasNumber: Boolean(password && /[0-9]/.test(password)),
    hasSpecial: Boolean(password && SPECIAL_CHAR_REGEX.test(password)),
  };
}

export function validatePassword(password: string): { isValid: boolean; message?: string; checks: PasswordChecks } {
  const checks = getPasswordChecks(password);

  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required.', checks };
  }

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

export function validateTransactionTitle(title: string): ValidationResult {
  const trimmed = (title || '').trim();
  if (!trimmed) {
    return { isValid: false, message: 'Transaction title is required.' };
  }
  if (trimmed.length < 2 || trimmed.length > 80) {
    return { isValid: false, message: 'Transaction title must be between 2 and 80 characters.' };
  }
  if (!/[a-zA-Z0-9]/.test(trimmed)) {
    return { isValid: false, message: 'Transaction title must contain letters or numbers.' };
  }
  return { isValid: true, sanitized: trimmed };
}

export function validateAmount(amount: number | string): { isValid: boolean; message?: string; parsedAmount?: number } {
  if (amount === '' || amount === null || amount === undefined) {
    return { isValid: false, message: 'Amount is required.' };
  }
  const parsed = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(parsed) || !Number.isFinite(parsed)) {
    return { isValid: false, message: 'Please enter a valid numeric amount.' };
  }
  if (parsed <= 0) {
    return { isValid: false, message: 'Amount must be greater than 0.' };
  }
  if (parsed > MAX_AMOUNT) {
    return { isValid: false, message: `Amount cannot exceed ₹${MAX_AMOUNT.toLocaleString('en-IN')}.` };
  }
  return { isValid: true, parsedAmount: parsed };
}

export function validateBudgetCategory(category: string): ValidationResult {
  const trimmed = (category || '').trim();
  if (!trimmed) {
    return { isValid: false, message: 'Budget category is required.' };
  }
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { isValid: false, message: 'Category must be between 2 and 50 characters.' };
  }
  if (!/[a-zA-Z0-9]/.test(trimmed)) {
    return { isValid: false, message: 'Category must contain letters or numbers.' };
  }
  return { isValid: true, sanitized: trimmed };
}
