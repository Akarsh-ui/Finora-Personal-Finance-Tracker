import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  TrendingUp,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sun,
  Moon,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import {
  validateName,
  validateEmail,
  validatePassword,
  getPasswordChecks,
} from '../../utils/validation';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const { login, signup, error, clearError } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isLogin, setIsLogin] = useState<boolean>(initialMode === 'login');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientValidationMsg, setClientValidationMsg] = useState<string | null>(null);

  // Interaction / dirty tracking for inline warnings
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const pwChecks = getPasswordChecks(password);

  const emailInlineValidation = emailTouched && email.length > 0
    ? validateEmail(email, { allowNumericLocal: isLogin })
    : null;

  const nameInlineValidation = !isLogin && nameTouched && name.length > 0
    ? validateName(name)
    : null;

  const switchMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    clearError();
    setClientValidationMsg(null);
    setNameTouched(false);
    setEmailTouched(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setClientValidationMsg(null);
    setNameTouched(true);
    setEmailTouched(true);

    if (!isLogin) {
      const nameVal = validateName(name);
      if (!nameVal.isValid) {
        setClientValidationMsg(nameVal.message || 'Please enter a valid full name.');
        return;
      }
    }

    const emailVal = validateEmail(email, { allowNumericLocal: isLogin });
    if (!emailVal.isValid) {
      setClientValidationMsg(emailVal.message || 'Please enter a valid email address.');
      return;
    }

    if (isLogin) {
      if (!password || password.trim().length === 0) {
        setClientValidationMsg('Password is required.');
        return;
      }
    } else {
      const pwVal = validatePassword(password);
      if (!pwVal.isValid) {
        setClientValidationMsg(pwVal.message || 'Password does not meet complexity requirements.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        await login(email.trim().toLowerCase(), password);
      } else {
        await signup(name.trim(), email.trim().toLowerCase(), password);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header with Brand & Theme Toggle */}
      <header className="w-full flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white shadow-md shadow-emerald-600/20">
            <TrendingUp className="h-5 w-5" strokeWidth={2.4} />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Finora
            </span>
            <span className="block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Personal Finance Tracker
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle color theme"
        >
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-7 sm:p-9 shadow-lg shadow-slate-900/5 dark:shadow-black/40">
            {/* Card Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isLogin ? 'Welcome Back' : 'Create Your Account'}
              </h1>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {isLogin
                  ? 'Enter your credentials to access your financial dashboard'
                  : 'Start managing your personal finances with real-time insights'}
              </p>
            </div>

            {/* Segmented Sign In / Register Tabs */}
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/60 dark:border-slate-800">
              <button
                type="button"
                onClick={() => switchMode(true)}
                className={`rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                  isLogin
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode(false)}
                className={`rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
                  !isLogin
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Register
              </button>
            </div>

            {/* Error Message */}
            {(clientValidationMsg || error) && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <div className="flex-1 font-medium leading-relaxed">
                  {clientValidationMsg || error}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name for Registration */}
              {!isLogin && (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Full Name
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="auth-name"
                      name="name"
                      autoComplete="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setNameTouched(true);
                        clearError();
                        setClientValidationMsg(null);
                      }}
                      onBlur={() => setNameTouched(true)}
                      placeholder="e.g. Akarsh Saini"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 dark:focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 transition-colors"
                    />
                  </div>
                  {nameInlineValidation && !nameInlineValidation.isValid && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{nameInlineValidation.message}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Email Address - RETAINED AUTOFILL FIX: bg-white dark:bg-slate-900 + text-slate-900 dark:text-white + name/autoComplete */}
              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Email Address
                </label>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="auth-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailTouched(true);
                      clearError();
                      setClientValidationMsg(null);
                    }}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 dark:focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 transition-colors"
                  />
                </div>
                {emailInlineValidation && !emailInlineValidation.isValid && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{emailInlineValidation.message}</span>
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Password
                  </label>
                  {isLogin && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      Min 6 characters
                    </span>
                  )}
                </div>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 dark:focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {!isLogin && (
                  <div className="mt-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-2.5 space-y-1.5 text-[11px]">
                    <div className="text-slate-500 dark:text-slate-400 font-semibold mb-1">
                      Password Requirements:
                    </div>
                    {[
                      { key: 'minLength', label: 'Between 8 and 64 characters', satisfied: pwChecks.minLength },
                      { key: 'hasUpper', label: 'At least one uppercase letter (A-Z)', satisfied: pwChecks.hasUpper },
                      { key: 'hasLower', label: 'At least one lowercase letter (a-z)', satisfied: pwChecks.hasLower },
                      { key: 'hasNumber', label: 'At least one number (0-9)', satisfied: pwChecks.hasNumber },
                      { key: 'hasSpecial', label: 'At least one special character (!@#$%^&*)', satisfied: pwChecks.hasSpecial },
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
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 py-2.5 px-4 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-600 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : isLogin ? (
                  <>
                    <span>Sign In to Finora</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>


            {/* Bottom Toggle Prompt */}
            <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
              {isLogin ? "Don't have an account yet? " : 'Already registered? '}
              <button
                type="button"
                onClick={() => switchMode(!isLogin)}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
              >
                {isLogin ? 'Register now' : 'Sign in here'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-slate-800/60">
        Finora Personal Finance Tracker · Secure Database-Backed Session
      </footer>
    </div>
  );
};
