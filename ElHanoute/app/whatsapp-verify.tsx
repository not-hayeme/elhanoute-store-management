import React, { useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function WhatsAppVerificationScreen() {
  const [otp, setOtp] = useState('');
  const { verifyOTP, isLoading } = useAuth();
  const router = useRouter();
  const { phone, isSignup } = useLocalSearchParams();

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    if (otp.trim().length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit code');
      return;
    }

    try {
      await verifyOTP(phone as string, otp.trim());
      // Navigation will be handled automatically by auth state change in _layout.tsx
    } catch (error: any) {
      console.error('Verify OTP error:', error);

      if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.error;

        switch (status) {
          case 400:
            Alert.alert('Invalid Code', 'The verification code is incorrect or expired');
            break;
          case 401:
            Alert.alert('Code Expired', 'The verification code has expired. Please request a new one');
            break;
          case 404:
            Alert.alert('Account Not Found', 'Account not found. Please try logging in again');
            break;
          case 429:
            Alert.alert('Too Many Attempts', 'Too many failed attempts. Please request a new code');
            break;
          case 500:
            Alert.alert('Server Error', 'Unable to verify code. Please try again later');
            break;
          default:
            Alert.alert('Verification Failed', errorMessage || 'Unable to verify code');
        }
      } else if (error.request) {
        Alert.alert('Connection Error', 'Please check your internet connection');
      } else {
        Alert.alert('Error', 'An unexpected error occurred');
      }
    }
  };

  const handleBackToLogin = () => {
    router.replace('/login');
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
          <Text style={styles.title}>
            {isSignup === 'true' ? 'Verify Your Account' : 'Verify Your Identity'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignup === 'true'
              ? 'Enter the 6-digit code sent to your WhatsApp to complete registration'
              : 'Enter the 6-digit code sent to your WhatsApp'
            }
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={styles.input}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter 6-digit code"
              keyboardType="numeric"
              maxLength={6}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <Text style={styles.otpHint}>
              Code sent to WhatsApp: {phone}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
              onPress={handleVerifyOTP}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyButtonText}>
                  {isSignup === 'true' ? 'Verify & Complete Registration' : 'Verify & Login'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToLogin}
              disabled={isLoading}
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
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
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 32,
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
    gap: 16,
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});