export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface UserNotifications {
  budgetThresholdAlerts: boolean;
  budgetExceededAlerts: boolean;
  transactionActivityAlerts: boolean;
  monthlySummaryAlerts: boolean;
}

export interface AuthUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  currency?: SupportedCurrency;
  notifications?: UserNotifications;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: AuthUser;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (updatedUser: AuthUser) => void;
  updateProfile: (name?: string, email?: string) => Promise<{ success: boolean; message: string; user?: AuthUser }>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; message: string }>;
  updatePreferences: (
    currency?: SupportedCurrency,
    notifications?: Partial<UserNotifications>
  ) => Promise<{ success: boolean; message: string; user?: AuthUser }>;
}
