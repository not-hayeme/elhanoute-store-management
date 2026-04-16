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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import api from '../src/api';

type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

export default function ResetPasswordScreen() {
  const [phone, setPhone] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const { sendResetOTP, isLoading } = useAuth();
  const router = useRouter();  // Check connection on component mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
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
      setPhone('+213' + text.replace(/^\+?213/, ''));
    } else {
      setPhone(text);
    }
  };

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (connectionStatus !== 'connected') {
      Alert.alert('Connection Error', 'Please check your connection and try again');
      return;
    }

    try {
      // Send OTP for password reset
      await sendResetOTP(phone.trim());
      // Navigate to OTP verification screen
      router.push({
        pathname: '/verify-reset-otp',
        params: { phone: phone.trim() }
      });
    } catch (error: any) {
      console.error('Send OTP error:', error);

      if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.error || error.response.data?.message;

        switch (status) {
          case 400:
            Alert.alert('Invalid Phone', 'Please enter a valid phone number');
            break;
          case 404:
            Alert.alert('Account Not Found', 'No account found with this phone number');
            break;
          case 429:
            Alert.alert('Too Many Attempts', 'Too many OTP requests. Please wait before trying again');
            break;
          case 500:
            Alert.alert('Server Error', 'Unable to send OTP. Please try again later');
            break;
          default:
            Alert.alert('Error', errorMessage || 'Unable to send OTP');
        }
      } else if (error.request) {
        Alert.alert('Connection Error', 'Please check your internet connection');
      } else {
        Alert.alert('Error', 'An unexpected error occurred');
      }
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
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

          <View style={styles.header}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your phone number to receive a verification code</Text>
          </View>

          <View style={styles.form}>
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
                autoFocus
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                onPress={handleSendOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              disabled={isLoading}
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
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
  otpInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 24,
    backgroundColor: '#fff',
    textAlign: 'center',
    letterSpacing: 8,
  },
  otpHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#ccc',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryActions: {
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  backButton: {
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});