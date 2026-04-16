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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import api from '../src/api';

type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

export default function SignupScreen() {
  const [formData, setFormData] = useState({
    name: '',
    lastname: '',
    email: '',
    phone: '',
    dateofbirth: '',
    password: '',
    confirmPassword: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const { signup, sendOTP, isLoading } = useAuth();
  const router = useRouter();

  // Check connection on component mount
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (text: string) => {
    // Automatically prepend +213 if not present
    if (text && !text.startsWith('+213')) {
      handleInputChange('phone', '+213' + text.replace(/^\+?213/, ''));
    } else {
      handleInputChange('phone', text);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
      // Format date as YYYY-MM-DD
      const formattedDate = selectedDate.toISOString().split('T')[0];
      handleInputChange('dateofbirth', formattedDate);
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const validateForm = () => {
    const { name, lastname, phone, dateofbirth, password, confirmPassword } = formData;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your first name');
      return false;
    }

    if (!lastname.trim()) {
      Alert.alert('Error', 'Please enter your last name');
      return false;
    }

    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }

    // If email provided, validate format
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        Alert.alert('Error', 'Please enter a valid email address');
        return false;
      }
    }

    if (!dateofbirth.trim()) {
      Alert.alert('Error', 'Please enter your date of birth');
      return false;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateofbirth)) {
      Alert.alert('Error', 'Please enter date of birth in YYYY-MM-DD format');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (connectionStatus !== 'connected') {
      Alert.alert('Connection Error', 'Please check your connection and try again');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      // Create user account
      const { confirmPassword, ...userData } = formData;
      await signup(userData);

      // Send OTP for verification
      await sendOTP(formData.phone);

      // Navigate to WhatsApp verification screen
      router.push({
        pathname: '/whatsapp-verify',
        params: { phone: formData.phone, isSignup: 'true' }
      });
    } catch (error: any) {
      console.error('Signup error:', error);

      if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.error || error.response.data?.message;

        switch (status) {
          case 400:
            Alert.alert('Invalid Data', errorMessage || 'Please check your information');
            break;
          case 409:
            Alert.alert('Account Exists', 'An account with this phone number already exists');
            break;
          case 500:
            Alert.alert('Server Error', 'Something went wrong. Please try again later');
            break;
          default:
            Alert.alert('Signup Failed', errorMessage || 'Unable to create account');
        }
      } else if (error.request) {
        Alert.alert('Connection Error', 'Please check your internet connection and try again');
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join us and start managing your store</Text>

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
            {/* Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder="Enter your first name"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Last Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={formData.lastname}
                onChangeText={(value) => handleInputChange('lastname', value)}
                placeholder="Enter your last name"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Email Input (optional) */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email (optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="Enter your email (optional)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Phone Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={handlePhoneChange}
                placeholder="Enter your phone number (+213 will be added automatically)"
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Date of Birth Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={showDatePickerModal}
              >
                <Text style={[styles.dateText, !formData.dateofbirth && styles.datePlaceholder]}>
                  {formData.dateofbirth
                    ? new Date(formData.dateofbirth).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Select your date of birth'
                  }
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()} // Don't allow future dates
                  minimumDate={new Date(1900, 0, 1)} // Reasonable minimum date
                />
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                placeholder="Enter your password (min 6 characters)"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                placeholder="Confirm your password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.signupButtonText}>Create Account & Send Code</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginText}>Sign In</Text>
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
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  datePlaceholder: {
    color: '#999',
  },
  buttonContainer: {
    marginTop: 8,
  },
  signupButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signupButtonDisabled: {
    backgroundColor: '#ccc',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
  },
  loginText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});