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
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import api from '../src/api';

export default function JoinStoreScreen() {
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);

  const { login } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Parse invitation token from URL
    const token = params.token as string;

    console.log('Invitation token:', token);

    if (!token) {
      Alert.alert('Invalid Invitation', 'This invitation link is invalid or expired.');
      router.replace('/login');
      return;
    }

    // Validate invitation token with backend
    validateInvitation(token);
  }, [params]);

  const validateInvitation = async (token: string) => {
    try {
      const response = await api.get(`/invitations/validate/${token}`);
      const invitation = response.data;
      setInvitationData(invitation);
    } catch (error: any) {
      console.error('Validate invitation error:', error);
      if (error.response?.status === 404) {
        Alert.alert('Invalid Invitation', 'This invitation link is invalid.');
      } else if (error.response?.status === 400) {
        Alert.alert('Invalid Invitation', error.response.data.error || 'This invitation is no longer valid.');
      } else {
        Alert.alert('Error', 'Failed to validate invitation. Please try again.');
      }
      router.replace('/login');
    }
  };

  const handleJoinStore = async () => {
    if (!invitationData) return;

    // Validate inputs
    if (!name.trim() || !lastname.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsJoining(true);

    try {
      // Register the new user
      const registerData = {
        name: name.trim(),
        lastname: lastname.trim(),
        email: email.trim() || undefined,
        phone: invitationData.phone,
        password: password,
      };

      const registerResponse = await api.post('/users', registerData);

      if (registerResponse.status === 201) {
        // Accept the invitation
        await api.post(`/invitations/${invitationData._id}/accept`, {
          userId: registerResponse.data._id
        });

        // Login the new user
        await login(email || invitationData.phone, password);

        Alert.alert('Success', `Welcome to ${invitationData.storeId.name}! You have been added as an employee.`);
        router.replace('/(tabs)'); // Navigate to main app
      }
    } catch (error: any) {
      console.error('Join store error:', error);

      if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.message || error.response.data?.error;

        switch (status) {
          case 400:
            Alert.alert('Invalid Input', errorMessage || 'Please check your information');
            break;
          case 409:
            Alert.alert('Account Exists', 'An account with this phone number already exists');
            break;
          case 500:
            Alert.alert('Server Error', 'Something went wrong. Please try again later');
            break;
          default:
            Alert.alert('Registration Failed', errorMessage || 'Unable to create account');
        }
      } else {
        Alert.alert('Connection Error', 'Please check your internet connection and try again');
      }
    } finally {
      setIsJoining(false);
    }
  };

  if (!invitationData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading invitation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Join {invitationData.storeId.name}</Text>
            <Text style={styles.subtitle}>
              You've been invited by {invitationData.invitedBy.name} {invitationData.invitedBy.lastname}
            </Text>
          </View>

          <View style={styles.form}>
            {/* Phone Display (read-only) */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={[styles.input, styles.readOnlyInput]}>
                <Text style={styles.readOnlyText}>{invitationData.phone}</Text>
              </View>
              <Text style={styles.hint}>
                This phone number is linked to your invitation
              </Text>
            </View>

            {/* Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your first name"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Last Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={lastname}
                onChangeText={setLastname}
                placeholder="Enter your last name"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Email Input (optional) */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email (Optional)</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password (min 6 characters)"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Join Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.joinButton, isJoining && styles.joinButtonDisabled]}
                onPress={handleJoinStore}
                disabled={isJoining}
              >
                {isJoining ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.joinButtonText}>Join Store</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
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
    lineHeight: 22,
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
  readOnlyInput: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#666',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 8,
  },
  joinButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#ccc',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});