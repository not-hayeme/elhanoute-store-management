import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Camera, CameraView } from 'expo-camera';
import { useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/api';

interface Store {
  _id: string;
  name: string;
  ownerId: {
    _id: string;
  };
}

export default function AddItemScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [store, setStore] = useState<Store | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Form state
  const [itemData, setItemData] = useState({
    name: '',
    reference: '',
    price: '',
    unitsPerBox: '',
    promo: '',
  });

  useEffect(() => {
    fetchUserStore();
    requestCameraPermission();
  }, [user]);

  // Clear form data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Check if we're in edit mode
      const mode = params.mode as string;
      const itemId = params.itemId as string;
      const itemDataParam = params.itemData as string;

      if (mode === 'edit' && itemId && itemDataParam) {
        // Edit mode - populate form with existing data
        setIsEditMode(true);
        setEditingItemId(itemId);
        const parsedItemData = JSON.parse(itemDataParam);
        setItemData(parsedItemData);
      } else {
        // Create mode - reset form
        setIsEditMode(false);
        setEditingItemId(null);
        setItemData({
          name: '',
          reference: '',
          price: '',
          unitsPerBox: '',
          promo: '',
        });
      }

      // Reset scanning state
      setScanned(false);
      setIsScanning(false);
      setIsSaving(false);
    }, [params.mode, params.itemId, params.itemData])
  );

  const fetchUserStore = async () => {
    if (!user) return;

    try {
      const response = await api.get('/stores');
      const stores: Store[] = response.data;
      const userStore = stores.find(store => store.ownerId._id === user._id);
      setStore(userStore || null);
    } catch (error) {
      console.error('Error fetching store:', error);
      Alert.alert('خطأ', 'فشل في تحميل معلومات المتجر');
    }
  };

  const requestCameraPermission = async () => {
    // Check if we're on a platform that supports camera
    if (Platform.OS === 'web') {
      setHasPermission(false);
      return;
    }

    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.warn('Camera not available:', error);
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setIsScanning(false);
    setItemData(prev => ({ ...prev, reference: data }));

    Alert.alert(
      'تم مسح الباركود',
      `المرجع: ${data}`,
      [
        { text: 'موافق' },
        {
          text: 'مسح مرة أخرى',
          onPress: () => {
            setScanned(false);
            setIsScanning(true);
          }
        }
      ]
    );
  };

  const startScanning = () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'مسح الباركود غير متوفر',
        'مسح الباركود غير مدعوم على الويب. يرجى إدخال المرجع يدوياً.',
        [{ text: 'موافق' }]
      );
      return;
    }

    if (hasPermission === null) {
      Alert.alert('إذن الكاميرا مطلوب لمسح الباركود');
      return;
    }
    if (hasPermission === false) {
      Alert.alert('لا يوجد إذن كاميرا', 'يرجى تفعيل إذن الكاميرا في الإعدادات');
      return;
    }
    setIsScanning(true);
    setScanned(false);
  };

  const stopScanning = () => {
    setIsScanning(false);
    setScanned(false);
  };

  const handleSave = async () => {
    if (!store) {
      Alert.alert('خطأ', 'لم يتم العثور على متجر');
      return;
    }

    // Validation
    if (!itemData.name.trim()) {
      Alert.alert('خطأ', 'اسم المنتج مطلوب');
      return;
    }
    if (!itemData.reference.trim()) {
      Alert.alert('خطأ', 'مرجع المنتج مطلوب');
      return;
    }
    if (!itemData.price.trim()) {
      Alert.alert('خطأ', 'سعر المنتج مطلوب');
      return;
    }

    const price = parseFloat(itemData.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال سعر صحيح');
      return;
    }

    try {
      setIsSaving(true);

      const itemToSave = {
        name: itemData.name.trim(),
        reference: itemData.reference.trim(),
        price: price,
        unitsPerBox: itemData.unitsPerBox ? parseInt(itemData.unitsPerBox) : undefined,
        promo: itemData.promo.trim() || undefined,
        storeId: store._id,
        addedBy: user?._id,
      };

      if (isEditMode && editingItemId) {
        // Edit mode - update existing item
        await api.put(`/items/${editingItemId}`, itemToSave);
        Alert.alert('نجح', 'تم تحديث المنتج بنجاح', [
          {
            text: 'موافق',
            onPress: () => router.back()
          }
        ]);
      } else {
        // Create mode - add new item
        await api.post('/items', itemToSave);
        Alert.alert('نجح', 'تم إضافة المنتج بنجاح', [
          {
            text: 'موافق',
            onPress: () => router.back()
          }
        ]);
      }
    } catch (error: any) {
      console.error('Error saving item:', error);
      Alert.alert('خطأ', error.response?.data?.error || `فشل في ${isEditMode ? 'تحديث' : 'إضافة'} المنتج`);
    } finally {
      setIsSaving(false);
    }
  };

  const updateItemData = (field: string, value: string) => {
    setItemData(prev => ({ ...prev, [field]: value }));
  };

  if (!store) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>جاري تحميل معلومات المتجر...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← رجوع</Text>
          </TouchableOpacity>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{isEditMode ? 'تعديل المنتج' : 'إضافة منتج جديد'}</Text>
          <Text style={styles.subtitle}>المتجر: {store.name}</Text>
        </View>

        <View style={styles.content}>
          {/* Barcode Scanner Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>مسح الباركود</Text>
            {Platform.OS === 'web' ? (
              <View style={styles.webWarning}>
                <Text style={styles.webWarningText}>
                  📱 مسح الباركود غير متوفر على الويب. يرجى إدخال المرجع يدوياً.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionDescription}>
                  امسح باركود المنتج لملء حقل المرجع تلقائياً
                </Text>

                {!isScanning ? (
                  <TouchableOpacity
                    style={styles.scanButton}
                    onPress={startScanning}
                    disabled={hasPermission === false}
                  >
                    <Text style={styles.scanButtonText}>
                      {hasPermission === false ? 'الكاميرا غير مسموحة' : '📱 مسح الباركود'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.scannerContainer}>
                    <CameraView
                      style={styles.scanner}
                      facing="back"
                      onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    />
                    <View style={styles.scannerOverlay}>
                      <TouchableOpacity
                        style={styles.stopScanButton}
                        onPress={stopScanning}
                      >
                        <Text style={styles.stopScanButtonText}>إيقاف المسح</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Item Details Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>تفاصيل المنتج</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>الاسم *</Text>
              <TextInput
                style={styles.input}
                value={itemData.name}
                onChangeText={(value) => updateItemData('name', value)}
                placeholder="أدخل اسم المنتج"
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>المرجع *</Text>
              <View style={styles.referenceContainer}>
                <TextInput
                  style={styles.input}
                  value={itemData.reference}
                  onChangeText={(value) => updateItemData('reference', value)}
                  placeholder="أدخل أو امسح المرجع"
                  maxLength={50}
                />
                {Platform.OS !== 'web' && (
                  <TouchableOpacity
                    style={styles.miniScanButton}
                    onPress={startScanning}
                    disabled={hasPermission === false}
                  >
                    <Text style={styles.miniScanButtonText}>📱</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>السعر (دج) *</Text>
              <TextInput
                style={styles.input}
                value={itemData.price}
                onChangeText={(value) => updateItemData('price', value)}
                placeholder="0.00"
                keyboardType="decimal-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>الوحدات في الصندوق</Text>
              <TextInput
                style={styles.input}
                value={itemData.unitsPerBox}
                onChangeText={(value) => updateItemData('unitsPerBox', value)}
                placeholder="اختياري"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>العرض الترويجي</Text>
              <TextInput
                style={styles.input}
                value={itemData.promo}
                onChangeText={(value) => updateItemData('promo', value)}
                placeholder="نص العرض الترويجي الاختياري"
                maxLength={200}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>{isEditMode ? 'تحديث المنتج' : 'إضافة المنتج'}</Text>
            )}
          </TouchableOpacity>
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
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60, // Extra padding for status bar
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    right: 20, // Changed from left to right for RTL
    padding: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 80, // Account for absolutely positioned tab bar
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
    textAlign: 'right',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  scannerContainer: {
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  scanner: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16, // Changed from left to right for RTL
    left: 16,
  },
  stopScanButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopScanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    textAlign: 'right',
  },
  referenceContainer: {
    flexDirection: 'row-reverse', // Changed to row-reverse for RTL
    alignItems: 'center',
  },
  miniScanButton: {
    position: 'absolute',
    left: 8, // Changed from right to left for RTL
    top: 8,
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniScanButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  webWarning: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  webWarningText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});