import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser, AuthContextType, SupportedCurrency, UserNotifications } from '../types/auth';
import { setGlobalCurrency } from '../utils/formatters';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'finora_session_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Synchronize global formatting currency whenever user profile loads/changes
  useEffect(() => {
    if (user?.currency) {
      setGlobalCurrency(user.currency);
    } else {
      setGlobalCurrency('INR');
    }
  }, [user?.currency]);

  // Helper to attach authorization header if token exists in session
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    try {
      const storedToken = sessionStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch {
      // Ignore storage restrictions
    }
    return headers;
  };

  // Restore authenticated session on mount
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include', // Include HttpOnly cookies
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          if (data.user.currency) {
            setGlobalCurrency(data.user.currency);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
        if (res.status === 503) {
          const data = await res.json().catch(() => ({}));
          const advice = data.database?.error?.advice || '';
          setError(`${data.message || 'Database is currently disconnected.'} ${advice}`.trim());
        }
        try {
          sessionStorage.removeItem(TOKEN_KEY);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn('[Auth] Session check failed:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login action
  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const advice = data.database?.error?.advice ? ` ${data.database.error.advice}` : '';
        setError(`${data.message || 'Login failed. Please check your credentials.'}${advice}`);
        return false;
      }

      if (data.token) {
        try {
          sessionStorage.setItem(TOKEN_KEY, data.token);
        } catch {
          // ignore
        }
      }

      setUser(data.user);
      if (data.user?.currency) {
        setGlobalCurrency(data.user.currency);
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error during login.';
      setError(msg);
      return false;
    }
  };

  // Signup action
  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const advice = data.database?.error?.advice ? ` ${data.database.error.advice}` : '';
        setError(`${data.message || 'Registration failed. Please check your details.'}${advice}`);
        return false;
      }

      if (data.token) {
        try {
          sessionStorage.setItem(TOKEN_KEY, data.token);
        } catch {
          // ignore
        }
      }

      setUser(data.user);
      if (data.user?.currency) {
        setGlobalCurrency(data.user.currency);
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error during signup.';
      setError(msg);
      return false;
    }
  };

  // Logout action
  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.warn('[Auth] Logout request error:', err);
    } finally {
      try {
        sessionStorage.removeItem(TOKEN_KEY);
      } catch {
        // ignore
      }
      setUser(null);
      setError(null);
      setGlobalCurrency('INR');
    }
  };

  // Direct user state updater
  const updateUser = useCallback((updatedUser: AuthUser) => {
    setUser(updatedUser);
    if (updatedUser.currency) {
      setGlobalCurrency(updatedUser.currency);
    }
  }, []);

  // Update profile name & email
  const updateProfile = async (
    name?: string,
    email?: string
  ): Promise<{ success: boolean; message: string; user?: AuthUser }> => {
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'Failed to update profile.',
        };
      }

      if (data.token) {
        try {
          sessionStorage.setItem(TOKEN_KEY, data.token);
        } catch {
          // ignore
        }
      }

      if (data.user) {
        updateUser(data.user);
      }

      return {
        success: true,
        message: data.message || 'Profile updated successfully.',
        user: data.user,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error updating profile.';
      return { success: false, message: msg };
    }
  };

  // Change password
  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'Failed to change password.',
        };
      }

      if (data.token) {
        try {
          sessionStorage.setItem(TOKEN_KEY, data.token);
        } catch {
          // ignore
        }
      }

      return {
        success: true,
        message: data.message || 'Password changed successfully.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error changing password.';
      return { success: false, message: msg };
    }
  };

  // Update currency and notification preferences
  const updatePreferences = async (
    currency?: SupportedCurrency,
    notifications?: Partial<UserNotifications>
  ): Promise<{ success: boolean; message: string; user?: AuthUser }> => {
    try {
      const res = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ currency, notifications }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'Failed to update preferences.',
        };
      }

      if (data.user) {
        updateUser(data.user);
      }

      return {
        success: true,
        message: data.message || 'Preferences saved successfully.',
        user: data.user,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error updating preferences.';
      return { success: false, message: msg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        error,
        login,
        signup,
        logout,
        clearError,
        updateUser,
        updateProfile,
        changePassword,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
