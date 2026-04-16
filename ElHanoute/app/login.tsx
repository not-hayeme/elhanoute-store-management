import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import api from '../src/api';

type AuthMethod = 'email' | 'phone';
type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

export default function LoginScreen() {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const { verifyCredentials, sendOTP, isLoading } = useAuth();
  const router = useRouter();

  // Check connection on component mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      // Simple ping to check if backend is reachable
      const response = await api.get('/health');
      if (response.status === 200) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  const handlePhoneChange = (text: string) => {
    // Automatically prepend +213 if not present
    if (text && !text.startsWith('+213')) {
      setPhone('+213' + text.replace(/^\+?213/, '')); // Remove any existing +213 first
    } else {
      setPhone(text);
    }
  };

  const handleLogin = async () => {
    if (connectionStatus !== 'connected') {
      Alert.alert('Connection Error', 'Please check your connection and try again');
      return;
    }

    if (!phone.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both phone number and password');
      return;
    }

    console.log('🔍 Login attempt:', {
      phone: phone.trim(),
      passwordLength: password.length,
      connectionStatus
    });

    try {
      // Verify credentials first
      console.log('📞 Verifying credentials for phone:', phone.trim());
      await verifyCredentials(phone.trim(), password.trim());
      console.log('✅ Credentials verified successfully');

      // If credentials are valid, send OTP and navigate to WhatsApp verification screen
      console.log('📱 Sending OTP to phone:', phone.trim());
      await sendOTP(phone.trim());
      console.log('✅ OTP sent successfully, navigating to verification');

      router.push({
        pathname: '/whatsapp-verify',
        params: { phone: phone.trim() }
      });
    } catch (error: any) {
      console.error('❌ Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        phone: phone.trim()
      });

      // Handle different error types
      if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.message || error.response.data?.error;
        const errorDetails = error.response.data;

        console.log('🔍 Error response analysis:', {
          status,
          errorMessage,
          errorDetails,
          isUserFound: status !== 404,
          isPasswordWrong: status === 401
        });

        switch (status) {
          case 400:
            Alert.alert('Invalid Input', 'Please check your phone number and password format');
            break;
          case 401:
            Alert.alert('Wrong Password', 'Incorrect password for this phone number. Please try again.');
            break;
          case 404:
            Alert.alert('Account Not Found', `No account found with phone number: ${phone.trim()}\n\nPlease check the number or sign up for a new account.`);
            break;
          case 429:
            Alert.alert('Too Many Attempts', 'Please wait a moment before trying again');
            break;
          case 500:
            Alert.alert('Server Error', 'Something went wrong on our end. Please try again later');
            break;
          default:
            Alert.alert('Login Failed', errorMessage || `Unexpected error (${status})`);
        }
      } else if (error.request) {
        // Network error
        console.log('🌐 Network error - no response received');
        Alert.alert('Connection Error', 'Cannot connect to server. Please check your internet connection and try again');
      } else {
        // Other error
        console.log('⚠️ Unexpected error:', error);
        Alert.alert('Error', 'An unexpected error occurred. Please try again');
      }
    }
  };

  const testUserLookup = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter a phone number first');
      return;
    }

    try {
      console.log('🔍 Testing user lookup for phone:', phone.trim());

      // Try to find user (this will show if user exists regardless of password)
      const response = await api.post('/users/login', {
        phone: phone.trim(),
        password: 'dummy_password_to_check_if_user_exists'
      });

      console.log('✅ User found:', response.data.user);
      Alert.alert('User Found', `User exists: ${response.data.user.name} ${response.data.user.lastname}`);
    } catch (error: any) {
      console.log('🔍 User lookup test result:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        error: error.response?.data?.error
      });

      if (error.response?.status === 401) {
        // This could mean user exists but wrong password, OR user doesn't exist
        // Let's try a different approach - check if we can find user by phone directly
        try {
          console.log('🔍 Checking if user exists in database...');
          const checkResponse = await api.get(`/users?phone=${encodeURIComponent(phone.trim())}`);
          if (checkResponse.data && checkResponse.data.length > 0) {
            Alert.alert('User Exists', `User found in database: ${checkResponse.data[0].name} ${checkResponse.data[0].lastname}\n\nThe issue is likely the password.`);
          } else {
            Alert.alert('User Not Found', `No user found with phone number: ${phone.trim()}`);
          }
        } catch (checkError) {
          console.log('❌ Could not check user existence:', checkError);
          Alert.alert('Check Failed', 'Could not verify if user exists in database');
        }
      } else if (error.response?.status === 404) {
        Alert.alert('User Not Found', `No account found with phone number: ${phone.trim()}`);
      } else {
        Alert.alert('Error', `Unexpected error: ${error.response?.status || 'Unknown'}`);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in with phone & password</Text>

          {/* Connection Status */}
          <View style={styles.connectionStatus}>
            {connectionStatus === 'checking' && (
              <>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={[styles.connectionText, styles.connectionChecking]}>
                  Checking connection...
                </Text>
              </>
            )}
            {connectionStatus === 'connected' && (
              <>
                <View style={styles.connectionDotConnected} />
                <Text style={[styles.connectionText, styles.connectionConnected]}>
                  Connected to server
                </Text>
              </>
            )}
            {connectionStatus === 'disconnected' && (
              <>
                <View style={styles.connectionDotDisconnected} />
                <Text style={[styles.connectionText, styles.connectionDisconnected]}>
                  No connection to server
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={checkConnection}
                  disabled={isLoading}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.form}>
          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder="Enter your phone number (+213 will be added automatically)"
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Verify & Send Code</Text>
              )}
            </TouchableOpacity>

            {/* Debug Button - Remove in production */}
            <TouchableOpacity
              style={[styles.debugButton]}
              onPress={testUserLookup}
              disabled={isLoading}
            >
              <Text style={styles.debugButtonText}>🔍 Check if User Exists</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.forgotPasswordContainer}>
          <TouchableOpacity onPress={() => router.push('/reset-password')}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text style={styles.signupText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    gap: 8,
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectionChecking: {
    color: '#007AFF',
  },
  connectionConnected: {
    color: '#28a745',
  },
  connectionDisconnected: {
    color: '#dc3545',
  },
  connectionDotConnected: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28a745',
  },
  connectionDotDisconnected: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc3545',
  },
  retryButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  otpHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  buttonContainer: {
    gap: 12,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '400',
  },
  debugButton: {
    backgroundColor: '#ffa500',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#666',
  },
  signupText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});