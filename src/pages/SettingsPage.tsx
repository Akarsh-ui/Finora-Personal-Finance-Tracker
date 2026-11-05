import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  ShieldCheck,
  Bell,
  Coins,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  Info,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SupportedCurrency, UserNotifications } from '../types/auth';
import { formatDate } from '../utils/formatters';
import {
  validateName,
  validateEmail,
  validatePassword,
  getPasswordChecks,
} from '../utils/validation';

interface SettingsPageProps {
  onLogout?: () => void;
}

const CURRENCY_OPTIONS: Array<{
  code: SupportedCurrency;
  symbol: string;
  name: string;
  region: string;
}> = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', region: 'India (Default)' },
  { code: 'USD', symbol: '$', name: 'US Dollar', region: 'United States' },
  { code: 'EUR', symbol: '€', name: 'Euro', region: 'European Union' },
  { code: 'GBP', symbol: '£', name: 'British Pound', region: 'United Kingdom' },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({ onLogout }) => {
  const { user, updateProfile, changePassword, updatePreferences, logout } = useAuth();

  // Active section tab
  const [activeSection, setActiveSection] = useState<'all' | 'profile' | 'security' | 'preferences' | 'notifications' | 'account'>('all');

  // --- Profile Form State ---
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // --- Password Form State ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const newPwChecks = getPasswordChecks(newPassword);

  // --- Preferences State ---
  const [currency, setCurrency] = useState<SupportedCurrency>(user?.currency || 'INR');
  const [notifications, setNotifications] = useState<UserNotifications>({
    budgetThresholdAlerts: user?.notifications?.budgetThresholdAlerts ?? true,
    budgetExceededAlerts: user?.notifications?.budgetExceededAlerts ?? true,
    transactionActivityAlerts: user?.notifications?.transactionActivityAlerts ?? true,
    monthlySummaryAlerts: user?.notifications?.monthlySummaryAlerts ?? true,
  });
  const [isSubmittingPrefs, setIsSubmittingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState<string | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  // Synchronize state when user changes
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      if (user.currency) setCurrency(user.currency);
      if (user.notifications) {
        setNotifications({
          budgetThresholdAlerts: user.notifications.budgetThresholdAlerts ?? true,
          budgetExceededAlerts: user.notifications.budgetExceededAlerts ?? true,
          transactionActivityAlerts: user.notifications.transactionActivityAlerts ?? true,
          monthlySummaryAlerts: user.notifications.monthlySummaryAlerts ?? true,
        });
      }
    }
  }, [user]);

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      setProfileError(nameValidation.message || 'Please provide a valid full name.');
      return;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setProfileError(emailValidation.message || 'Please provide a valid email address.');
      return;
    }

    setIsSubmittingProfile(true);
    try {
      const res = await updateProfile(nameValidation.sanitized!, emailValidation.sanitized!);
      if (res.success) {
        setProfileSuccess(res.message || 'Profile information updated successfully.');
      } else {
        setProfileError(res.message);
      }
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword || currentPassword.trim().length === 0) {
      setPasswordError('Please enter your current password.');
      return;
    }

    const pwValidation = validatePassword(newPassword);
    if (!pwValidation.isValid) {
      setPasswordError(pwValidation.message || 'New password does not meet complexity requirements.');
      return;
    }

    if (!confirmPassword) {
      setPasswordError('Please confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await changePassword(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setPasswordSuccess('Your password has been changed successfully. Your session remains secure.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.message);
      }
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Handle Currency Preference Change
  const handleCurrencyChange = async (newCurrency: SupportedCurrency) => {
    setCurrency(newCurrency);
    setPrefsSuccess(null);
    setPrefsError(null);
    setIsSubmittingPrefs(true);
    try {
      const res = await updatePreferences(newCurrency, undefined);
      if (res.success) {
        setPrefsSuccess(`Display currency changed to ${newCurrency}. App formatting updated.`);
      } else {
        setPrefsError(res.message);
      }
    } finally {
      setIsSubmittingPrefs(false);
    }
  };

  // Handle Notification Toggle
  const handleToggleNotification = async (key: keyof UserNotifications) => {
    const updatedNotifications = {
      ...notifications,
      [key]: !notifications[key],
    };
    setNotifications(updatedNotifications);
    setPrefsSuccess(null);
    setPrefsError(null);
    setIsSubmittingPrefs(true);
    try {
      const res = await updatePreferences(undefined, updatedNotifications);
      if (res.success) {
        setPrefsSuccess('Notification preferences saved to your account.');
      } else {
        setPrefsError(res.message);
      }
    } finally {
      setIsSubmittingPrefs(false);
    }
  };

  // Handle Logout
  const handleLogoutClick = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await logout();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings & Preferences
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your personal profile, security credentials, currency display standards, and alerts.
          </p>
        </div>

        {/* Quick Nav Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'profile', label: 'Profile' },
              { id: 'security', label: 'Security' },
              { id: 'preferences', label: 'Currency' },
              { id: 'notifications', label: 'Alerts' },
              { id: 'account', label: 'Account' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeSection === item.id
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-xs'
                  : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Profile & Security (2 cols on lg) */}
        <div className="space-y-6 lg:col-span-2">
          {/* SECTION 1: PROFILE MANAGEMENT */}
          {(activeSection === 'all' || activeSection === 'profile') && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Profile Information</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update your account name and registered email address</p>
                </div>
              </div>

              {profileSuccess && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-300 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="settings-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="settings-name"
                      name="name"
                      autoComplete="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      minLength={2}
                      maxLength={50}
                      className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden"
                      placeholder="e.g. Akarsh Saini"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="settings-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="settings-email"
                      name="email"
                      autoComplete="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden"
                      placeholder="e.g. name@example.com"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Updating your email will update future session credentials.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingProfile}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 2: PASSWORD MANAGEMENT */}
          {(activeSection === 'all' || activeSection === 'security') && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Security & Password</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update your account password with current credentials verification</p>
                </div>
              </div>

              {passwordSuccess && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-300 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
                {/* Current Password */}
                <div>
                  <label htmlFor="current-pw" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Current Password
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="current-pw"
                      name="current-password"
                      autoComplete="current-password"
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password & Confirm */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="new-pw" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      New Password
                    </label>
                    <div className="relative mt-1.5">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="new-pw"
                        name="new-password"
                        autoComplete="new-password"
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden"
                        placeholder="At least 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm-pw" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Confirm New Password
                    </label>
                    <div className="relative mt-1.5">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <input
                        id="confirm-pw"
                        name="confirm-password"
                        autoComplete="new-password"
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden"
                        placeholder="Re-enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Requirements Checklist */}
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3 space-y-1.5 text-[11px]">
                  <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">
                    Password Requirements:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {[
                      { key: 'minLength', label: 'Between 8 and 64 characters', satisfied: newPwChecks.minLength },
                      { key: 'hasUpper', label: 'At least one uppercase letter (A-Z)', satisfied: newPwChecks.hasUpper },
                      { key: 'hasLower', label: 'At least one lowercase letter (a-z)', satisfied: newPwChecks.hasLower },
                      { key: 'hasNumber', label: 'At least one number (0-9)', satisfied: newPwChecks.hasNumber },
                      { key: 'hasSpecial', label: 'At least one special character (!@#$%^&*)', satisfied: newPwChecks.hasSpecial },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className={`flex items-center gap-1.5 transition-colors ${
                          item.satisfied
                            ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <div
                          className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] ${
                            item.satisfied
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.satisfied ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : '•'}
                        </div>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Update Password</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 4: NOTIFICATION PREFERENCES */}
          {(activeSection === 'all' || activeSection === 'notifications') && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Notification Preferences</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure automated budget threshold alerts and monthly financial summaries
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  {
                    key: 'budgetThresholdAlerts' as const,
                    title: 'Budget Threshold Alerts (80%+)',
                    desc: 'Trigger proactive warnings when category expenditures reach or exceed 80% of your allocated monthly limit.',
                  },
                  {
                    key: 'budgetExceededAlerts' as const,
                    title: 'Budget Exceeded Alerts',
                    desc: 'Instant visual alerts when monthly expenditures cross 100% of your established budget.',
                  },
                  {
                    key: 'transactionActivityAlerts' as const,
                    title: 'Transaction Activity Log',
                    desc: 'Generate notification receipts when transactions are created, modified, or removed.',
                  },
                  {
                    key: 'monthlySummaryAlerts' as const,
                    title: 'Monthly Financial Summaries',
                    desc: 'Automated end-of-month financial breakdowns comparing previous periods and net savings rate.',
                  },
                ].map((item) => {
                  const isEnabled = notifications[item.key];
                  return (
                    <div
                      key={item.key}
                      className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.title}</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isEnabled}
                        onClick={() => handleToggleNotification(item.key)}
                        disabled={isSubmittingPrefs}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                          isEnabled ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 p-3 text-[11px] text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Preferences are securely stored with your account profile and applied in real time.</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Currency & Account Metadata (1 col on lg) */}
        <div className="space-y-6">
          {/* SECTION 3: CURRENCY PREFERENCES */}
          {(activeSection === 'all' || activeSection === 'preferences') && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Currency Standard</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Choose your preferred currency symbol</p>
                </div>
              </div>

              {prefsSuccess && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{prefsSuccess}</span>
                </div>
              )}

              {prefsError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-2.5 text-xs text-rose-800 dark:text-rose-300 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{prefsError}</span>
                </div>
              )}

              <div className="mt-4 space-y-2.5">
                {CURRENCY_OPTIONS.map((opt) => {
                  const isSelected = currency === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => handleCurrencyChange(opt.code)}
                      disabled={isSubmittingPrefs}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-500/20'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                            isSelected
                              ? 'bg-emerald-600 dark:bg-emerald-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {opt.symbol}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{opt.code}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">· {opt.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">{opt.region}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-white">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                Updating your currency preference formats all balances, budgets, reports, and charts dynamically across the application without modifying stored database transaction values.
              </p>
            </div>
          )}

          {/* SECTION 5: ACCOUNT INFORMATION */}
          {(activeSection === 'all' || activeSection === 'account') && (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Account Details</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Metadata and session security</p>
                </div>
              </div>

              <div className="mt-4 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 dark:text-slate-400">Account Status</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active & Verified
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-slate-500 dark:text-slate-400">Registered Email</span>
                  <span className="font-mono text-slate-900 dark:text-white font-medium truncate max-w-[180px]" title={user?.email}>
                    {user?.email || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-slate-500 dark:text-slate-400">Account Created</span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    {user?.createdAt ? formatDate(user.createdAt) : 'Recently Active'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-slate-500 dark:text-slate-400">Database Engine</span>
                  <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    MongoDB Atlas
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-slate-500 dark:text-slate-400">Active Currency</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {user?.currency || 'INR'} ({CURRENCY_OPTIONS.find((c) => c.code === (user?.currency || 'INR'))?.symbol})
                  </span>
                </div>
              </div>

              {/* Secure Logout Action */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 px-4 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300 transition-colors hover:bg-rose-100/70 dark:hover:bg-rose-900/40 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out of Finora</span>
                </button>
                <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
                  Clears local session tokens and HttpOnly session cookies.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
