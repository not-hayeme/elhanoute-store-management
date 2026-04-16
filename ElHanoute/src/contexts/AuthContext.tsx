import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

interface User {
  _id: string;
  name: string;
  lastname: string;
  email: string;
  image?: string;
}

interface SignupData {
  name: string;
  lastname: string;
  email?: string;
  phone: string;
  dateofbirth: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignupData) => Promise<void>;
  verifyCredentials: (phone: string, password: string) => Promise<User>;
  sendOTP: (phone: string) => Promise<void>;
  sendResetOTP: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored authentication on app start
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      // Add a timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auth check timeout')), 5000);
      });

      const authCheckPromise = async () => {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      };

      await Promise.race([authCheckPromise(), timeoutPromise]);
    } catch (error) {
      console.error('Error checking auth state:', error);
      // Clear any potentially corrupted data
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await api.post('/users/login', { email, password });

      const { token: newToken, user: userData } = response.data;

      // Store in AsyncStorage
      await AsyncStorage.setItem('token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      // Update state
      setToken(newToken);
      setUser(userData);
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: SignupData) => {
    try {
      setIsLoading(true);
      console.log('Creating user account for:', userData.phone);
      const response = await api.post('/users', userData);
      console.log('User account created successfully');
      return response.data;
    } catch (error: any) {
      console.error('Signup error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        switch (status) {
          case 400:
            throw new Error(errorData?.error || 'Invalid signup data');
          case 409:
            throw new Error('Phone number already in use');
          case 500:
            throw new Error('Server error. Please try again later');
          default:
            throw new Error(errorData?.message || errorData?.error || 'Signup failed');
        }
      } else if (error.request) {
        throw new Error('Cannot connect to server. Please check your internet connection');
      } else {
        throw new Error('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCredentials = async (phone: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('Verifying credentials for phone:', phone);
      const response = await api.post('/users/login', { phone, password });

      // Don't store token or user data yet - just verify credentials
      console.log('Credentials verified for user:', response.data.user.name);
      return response.data.user;
    } catch (error: any) {
      console.error('Credential verification error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });

      // Provide more specific error messages
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        switch (status) {
          case 400:
            throw new Error('Please provide both phone number and password');
          case 401:
            throw new Error('Incorrect password for this phone number');
          case 404:
            throw new Error('Account not found with this phone number');
          case 500:
            throw new Error('Server error. Please try again later');
          default:
            throw new Error(errorData?.message || errorData?.error || 'Credential verification failed');
        }
      } else if (error.request) {
        throw new Error('Cannot connect to server. Please check your internet connection');
      } else {
        throw new Error('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async (phone: string) => {
    try {
      setIsLoading(true);
  console.log('Sending OTP to phone:', phone);
  // backend routes are mounted under /api/auth/whatsapp
  const response = await api.post('/auth/whatsapp/send-otp', { phone });
      console.log('OTP sent successfully');
      return response.data;
    } catch (error: any) {
      console.error('Send OTP error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        switch (status) {
          case 400:
            throw new Error('Invalid phone number format');
          case 429:
            throw new Error('Too many OTP requests. Please wait before trying again');
          case 500:
            throw new Error('Failed to send OTP. Please try again later');
          default:
            throw new Error(errorData?.message || errorData?.error || 'Failed to send OTP');
        }
      } else if (error.request) {
        throw new Error('Cannot connect to server. Please check your internet connection');
      } else {
        throw new Error('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sendResetOTP = async (phone: string) => {
    try {
      setIsLoading(true);
      console.log('Sending reset OTP to phone:', phone);
      // backend routes are mounted under /api/auth/whatsapp
      const response = await api.post('/auth/whatsapp/send-reset-otp', { phone });
      console.log('Reset OTP sent successfully');
      return response.data;
    } catch (error: any) {
      console.error('Send reset OTP error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        switch (status) {
          case 400:
            throw new Error('Invalid phone number format');
          case 404:
            throw new Error('Phone number not registered');
          case 429:
            throw new Error('Too many OTP requests. Please wait before trying again');
          case 500:
            throw new Error('Failed to send OTP. Please try again later');
          default:
            throw new Error(errorData?.message || errorData?.error || 'Failed to send OTP');
        }
      } else if (error.request) {
        throw new Error('Cannot connect to server. Please check your internet connection');
      } else {
        throw new Error('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (phone: string, otp: string) => {
    try {
      setIsLoading(true);
  console.log('Verifying OTP for phone:', phone);
  // backend routes are mounted under /api/auth/whatsapp
  const response = await api.post('/auth/whatsapp/verify-otp', { phone, otp });

      const { token: newToken, user: userData } = response.data;
      console.log('OTP verification successful for user:', userData.name);

      // Store in AsyncStorage
      await AsyncStorage.setItem('token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      // Update state
      setToken(newToken);
      setUser(userData);
    } catch (error: any) {
      console.error('Verify OTP error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        switch (status) {
          case 400:
            throw new Error('Invalid OTP code');
          case 401:
            throw new Error('OTP expired or incorrect');
          case 404:
            throw new Error('Phone number not found');
          case 500:
            throw new Error('Verification failed. Please try again');
          default:
            throw new Error(errorData?.message || errorData?.error || 'OTP verification failed');
        }
      } else if (error.request) {
        throw new Error('Cannot connect to server. Please check your internet connection');
      } else {
        throw new Error('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    signup,
    verifyCredentials,
    sendOTP,
    sendResetOTP,
    verifyOTP,
    logout,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};