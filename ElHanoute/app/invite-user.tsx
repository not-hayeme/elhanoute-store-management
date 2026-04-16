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
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import api from '../src/api';
import * as Clipboard from 'expo-clipboard';

export default function InviteUserScreen() {
  const [phone, setPhone] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handlePhoneChange = (text: string) => {
    // Automatically prepend +213 if not present
    if (text && !text.startsWith('+213')) {
      setPhone('+213' + text.replace(/^\+?213/, '')); // Remove any existing +213 first
    } else {
      setPhone(text);
    }
  };

  const generateInvitationLink = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to generate invitation links');
      return;
    }

    setIsGenerating(true);

    try {
      // First, get the user's store
      const storeResponse = await api.get('/stores');
      const stores = storeResponse.data;
      const userStore = stores.find((store: any) => store.ownerId._id === user._id);

      if (!userStore) {
        Alert.alert('Error', 'No store found for your account');
        return;
      }

      // Create invitation in database
      const invitationData = {
        phone: phone.trim(),
        storeId: userStore._id,
        invitedBy: user._id
      };

      const invitationResponse = await api.post('/invitations', invitationData);
      const invitation = invitationResponse.data;

      // Create the invitation link using the token from database
      const invitationLink = `exp://192.168.1.100:8081/join-store?token=${invitation.token}`;

      setGeneratedLink(invitationLink);
      Alert.alert('Success', 'Invitation created and link generated successfully!');

    } catch (error: any) {
      console.error('Error creating invitation:', error);
      if (error.response?.status === 400) {
        Alert.alert('Error', error.response.data.error || 'Failed to create invitation');
      } else {
        Alert.alert('Error', 'Failed to create invitation. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedLink) return;

    try {
      await Clipboard.setStringAsync(generatedLink);
      Alert.alert('Success', 'Invitation link copied to clipboard!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link to clipboard');
    }
  };

  const resetForm = () => {
    setPhone('');
    setGeneratedLink('');
  };

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
            <Text style={styles.title}>Invite New User</Text>
            <Text style={styles.subtitle}>
              Generate a unique invitation link for a new user to join your store
            </Text>
          </View>

          <View style={styles.form}>
            {/* Phone Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder="Enter phone number (+213 will be added automatically)"
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.hint}>
                This phone number will be associated with the invitation
              </Text>
            </View>

            {/* Generate Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
                onPress={generateInvitationLink}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.generateButtonText}>Generate Invitation Link</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Generated Link */}
            {generatedLink ? (
              <View style={styles.linkContainer}>
                <Text style={styles.linkLabel}>Invitation Link:</Text>
                <View style={styles.linkBox}>
                  <Text style={styles.linkText} numberOfLines={3}>
                    {generatedLink}
                  </Text>
                </View>

                <View style={styles.linkActions}>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={copyToClipboard}
                  >
                    <Text style={styles.copyButtonText}>Copy Link</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={resetForm}
                  >
                    <Text style={styles.resetButtonText}>Generate New Link</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* Instructions */}
            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>How it works:</Text>
              <Text style={styles.instructionText}>
                1. Enter the phone number of the person you want to invite
              </Text>
              <Text style={styles.instructionText}>
                2. Generate a unique invitation link
              </Text>
              <Text style={styles.instructionText}>
                3. Share the link with the person via WhatsApp, SMS, or any messaging app
              </Text>
              <Text style={styles.instructionText}>
                4. When they click the link, they'll be able to join your store
              </Text>
            </View>
          </View>

          {/* Back Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Back to Users</Text>
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
    marginBottom: 24,
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
  hint: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginBottom: 24,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  linkLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  linkBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  linkActions: {
    flexDirection: 'row',
    gap: 12,
  },
  copyButton: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
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