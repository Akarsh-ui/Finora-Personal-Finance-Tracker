import { SupportedCurrency } from '../types/auth';

let globalCurrency: SupportedCurrency = 'INR';

/**
 * Update the global active currency for the app
 */
export function setGlobalCurrency(currency: SupportedCurrency) {
  if (['INR', 'USD', 'EUR', 'GBP'].includes(currency)) {
    globalCurrency = currency;
  }
}

/**
 * Get current active global currency
 */
export function getGlobalCurrency(): SupportedCurrency {
  return globalCurrency;
}

const CURRENCY_CONFIG: Record<
  SupportedCurrency,
  { locale: string; currency: string; symbol: string }
> = {
  INR: { locale: 'en-IN', currency: 'INR', symbol: '₹' },
  USD: { locale: 'en-US', currency: 'USD', symbol: '$' },
  EUR: { locale: 'de-DE', currency: 'EUR', symbol: '€' },
  GBP: { locale: 'en-GB', currency: 'GBP', symbol: '£' },
};

/**
 * Format numbers according to active or specified currency locale standards
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = globalCurrency,
  showDecimals: boolean = true
): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.INR;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Format currency with backward-compatibility for existing formatINR calls.
 * Dynamically respects the active user's global currency setting.
 */
export function formatINR(
  amount: number,
  showDecimals: boolean = true,
  currency?: SupportedCurrency
): string {
  return formatCurrency(amount, currency || globalCurrency, showDecimals);
}

/**
 * Format compact currency for chart ticks and badges (e.g. ₹1.2L, $1.2M, €45k)
 */
export function formatCompactINR(amount: number, currency: SupportedCurrency = globalCurrency): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.INR;
  const sym = config.symbol;

  if (currency === 'INR') {
    if (Math.abs(amount) >= 10000000) {
      return `${sym}${(amount / 10000000).toFixed(1)}Cr`;
    }
    if (Math.abs(amount) >= 100000) {
      return `${sym}${(amount / 100000).toFixed(1)}L`;
    }
  } else {
    if (Math.abs(amount) >= 1000000) {
      return `${sym}${(amount / 1000000).toFixed(1)}M`;
    }
  }

  if (Math.abs(amount) >= 1000) {
    return `${sym}${(amount / 1000).toFixed(0)}k`;
  }
  return `${sym}${amount}`;
}

/**
 * Format readable dates
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Calculate percentage accurately without artificially capping at 100% so over-budget usage is transparently shown
 */
export function calculatePercentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

