import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Item {
  _id: string;
  name: string;
  reference: string;
  price: number;
  unitsPerBox?: number;
}

interface Customer {
  _id: string;
  name: string;
  phone?: string;
}

interface ReceiptItem {
  itemId: string;
  quantity: number;
  price: number;
}

export default function AddReceiptScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();

  // State
  const [store, setStore] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [scannedItems, setScannedItems] = useState<{[key: string]: {
    item: Item;
    units: number;
    boxes: number;
    unitPrice: number;
  }}>({});
  const [discount, setDiscount] = useState<string>('0');
  const [pricePayed, setPricePayed] = useState<string>('0');

  // Camera state
  const [isScanning, setIsScanning] = useState(true); // Always scanning by default
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerDropdownExpanded, setCustomerDropdownExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [cameraHeight, setCameraHeight] = useState(Dimensions.get('window').height * 0.25);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingReceiptId, setEditingReceiptId] = useState<string>('');
  const [scrollY, setScrollY] = useState(0);

  // Memoize receiptId extraction to prevent unnecessary re-renders
  const receiptId = useMemo(() => {
    return Array.isArray(params?.receiptId) ? params.receiptId[0] : params?.receiptId;
  }, [params?.receiptId]);

  // Memoize data availability checks
  const hasRequiredData = useMemo(() => {
    return store && customers.length > 0 && items.length > 0;
  }, [store, customers.length, items.length]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      const { dy } = gestureState;
      const screenHeight = Dimensions.get('window').height;
      const newHeight = Math.max(screenHeight * 0.1, Math.min(screenHeight * 0.4, cameraHeight + dy));
      setCameraHeight(newHeight);
    },
    onPanResponderRelease: () => {
      // Optional: snap to predefined positions
    },
  });

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    console.log('useEffect triggered with receiptId:', receiptId);
    console.log('hasRequiredData:', hasRequiredData);
    console.log('editingReceiptId:', editingReceiptId);

    if (receiptId && hasRequiredData && receiptId !== editingReceiptId) {
      console.log('Calling fetchReceiptForEditing with:', receiptId);
      fetchReceiptForEditing(receiptId);
    } else if (!receiptId) {
      // Reset form state for new receipt creation
      console.log('Resetting form for new receipt creation');
      setSelectedCustomer('');
      setDiscount('0');
      setPricePayed('0');
      setReceiptNumber('');
      setScannedItems({});
      setIsEditing(false);
      setEditingReceiptId('');
      setExpandedItems(new Set());
    }
  }, [receiptId, hasRequiredData, editingReceiptId]);

  const fetchReceiptForEditing = async (receiptId: string) => {
    try {
      setLoading(true);
      console.log('Fetching receipt for editing:', receiptId);
      const response = await api.get(`/receipts/${receiptId}`);
      const receipt = response.data;
      console.log('Fetched receipt:', receipt);

      // Populate form with existing data
      setSelectedCustomer(receipt.customerId?._id || '');
      setDiscount(receipt.discount?.toString() || '0');
      setPricePayed(receipt.pricePayed?.toString() || '0');
      setReceiptNumber(receipt.receiptNumber || '');
      setEditingReceiptId(receiptId);

    // Populate scanned items
    const scannedItemsData: {[key: string]: any} = {};
    receipt.items?.forEach((receiptItem: any) => {
      console.log('Processing receipt item:', receiptItem);
      // Since items are populated, receiptItem.itemId is the full item object
      const itemId = receiptItem.itemId?._id || receiptItem.itemId;
      console.log('Item ID:', itemId);
      const item = items.find(i => i._id === itemId);
      console.log('Found item:', item);
      if (item) {
        scannedItemsData[item._id] = {
          item,
          units: receiptItem.quantity || 1,
          boxes: 0, // We'll need to calculate this based on unitsPerBox
          unitPrice: receiptItem.price || item.price || 0,
        };
      }
    });
    console.log('Scanned items data:', scannedItemsData);
    setScannedItems(scannedItemsData);      // Update header title
      setIsEditing(true);
    } catch (error) {
      console.error('Error fetching receipt for editing:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات الفاتورة للتعديل');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    if (!user) {
      // If there's no authenticated user yet, make sure we don't leave the
      // screen stuck in loading state. The caller (or router) will redirect
      // as needed; here we simply stop the spinner so UI can render.
      setLoading(false);
      return;
    }

    try {
      // Check for cached store data first
      const cachedData = await AsyncStorage.getItem('userStoreData');
      if (cachedData) {
        const { store, role, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

        if (cacheAge < CACHE_DURATION) {
          console.log('Using cached store data:', store.name, 'role:', role);
          setStore(store);
          setUserRole(role);

          // Fetch items for the cached store
          const itemsResponse = await api.get(`/items?storeId=${store._id}`);
          setItems(itemsResponse.data);

          // Fetch customers for the cached store
          const customersResponse = await api.get(`/customers?storeId=${store._id}`);
          setCustomers(customersResponse.data);

          setLoading(false);
          return;
        }
      }

      // Get user's store - check if user is owner or worker
      const storesResponse = await api.get('/stores');
      const stores = storesResponse.data;
      console.log('Stores data:', stores);

      let userStore = null;
      let userRole = null;

      // First check if user is an owner of any store
      userStore = stores.find((store: any) => store.ownerId._id === user._id);
      if (userStore) {
        userRole = 'owner';
        console.log('User is owner of store:', userStore.name);
      } else {
        // Check if user is a worker in any store
        for (const store of stores) {
          if (store.workers && Array.isArray(store.workers)) {
            const workerEntry = store.workers.find((worker: any) => worker.userId._id === user._id);
            if (workerEntry) {
              userStore = store;
              userRole = workerEntry.role;
              console.log('User is worker in store:', store.name, 'with role:', userRole);
              break;
            }
          }
        }
      }

      // Legacy check for user.stores array (backward compatibility)
      // Note: User type doesn't include stores property, so this check is removed

      if (!userStore) {
        console.log('No store found for user');
        Alert.alert('خطأ', 'لم يتم العثور على متجر');
        router.back();
        return;
      }

      // Cache the store data for 1 hour
      const cacheData = {
        store: userStore,
        role: userRole,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem('userStoreData', JSON.stringify(cacheData));

      setStore(userStore);
      setUserRole(userRole);

      // Get customers and items for this store
      const [customersResponse, itemsResponse] = await Promise.all([
        api.get(`/customers?storeId=${userStore._id}`),
        api.get(`/items?storeId=${userStore._id}`)
      ]);

      setCustomers(customersResponse.data);
      setItems(itemsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    // Find item by reference/barcode
    const foundItem = items.find(item =>
      item.reference?.toLowerCase() === data.toLowerCase() ||
      item._id === data
    );

    if (foundItem) {
      // Stop scanning temporarily
      setIsScanning(false);

      // Show confirmation alert
      Alert.alert(
        'تأكيد إضافة المنتج',
        `هل تريد إضافة "${foundItem.name}" إلى الفاتورة؟`,
        [
          {
            text: 'إلغاء',
            style: 'cancel',
            onPress: () => {
              // Resume scanning
              setIsScanning(true);
            }
          },
          {
            text: 'إضافة',
            onPress: () => {
              addItemToReceipt(foundItem);
              // Resume scanning after a short delay
              setTimeout(() => {
                setIsScanning(true);
              }, 1000);
            }
          }
        ]
      );
    } else {
      Alert.alert('غير موجود', 'لم يتم العثور على منتج بهذا الرمز');
    }
  };

  const addItemToReceipt = (item: Item) => {
    setScannedItems(prev => ({
      ...prev,
      [item._id]: {
        item,
        units: 1,
        boxes: 0,
        unitPrice: item.price || 0,
      }
    }));
  };

  const updateScannedItem = (itemId: string, updates: Partial<{
    units: number;
    boxes: number;
    unitPrice: number;
  }>) => {
    setScannedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        ...updates,
      }
    }));
  };

  const removeScannedItem = (itemId: string) => {
    setScannedItems(prev => {
      const newItems = { ...prev };
      delete newItems[itemId];
      return newItems;
    });
  };

  const calculateItemTotal = (itemData: any) => {
    const unitsFromBoxes = (itemData.boxes || 0) * (itemData.item.unitsPerBox || 1);
    const totalUnits = (itemData.units || 0) + unitsFromBoxes;
    return totalUnits * (itemData.unitPrice || 0);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    Object.values(scannedItems).forEach(itemData => {
      const itemTotal = calculateItemTotal(itemData);
      subtotal += itemTotal;
    });

    const discountAmount = parseFloat(discount) || 0;
    const total = Math.max(0, subtotal - discountAmount);

    return { subtotal, total };
  };

  const handleSaveReceipt = async () => {
    if (!store || Object.keys(scannedItems).length === 0) {
      Alert.alert('خطأ', 'يجب إضافة منتج واحد على الأقل');
      return;
    }

    // Generate a more unique receipt number
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newReceiptNumber = `RCP-${timestamp}-${randomPart}`;
    setReceiptNumber(newReceiptNumber);

    // Show receipt modal
    setShowReceiptModal(true);
  };

  const handleConfirmSave = async () => {
    try {
      // Validate required data
      if (!store || !receiptNumber) {
        Alert.alert('خطأ', 'بيانات غير مكتملة');
        return;
      }

      if (Object.keys(scannedItems).length === 0) {
        Alert.alert('خطأ', 'يجب إضافة منتج واحد على الأقل');
        return;
      }

      const receiptItems: ReceiptItem[] = Object.values(scannedItems).map(itemData => {
        const unitsFromBoxes = (itemData.boxes || 0) * (itemData.item.unitsPerBox || 1);
        const totalUnits = (itemData.units || 0) + unitsFromBoxes;

        if (totalUnits <= 0) {
          throw new Error(`كمية غير صحيحة للمنتج ${itemData.item.name}`);
        }

        if (itemData.unitPrice <= 0) {
          throw new Error(`سعر غير صحيح للمنتج ${itemData.item.name}`);
        }

        return {
          itemId: itemData.item._id,
          quantity: totalUnits,
          price: itemData.unitPrice,
        };
      });

      const { total } = calculateTotals();

      if (total < 0) {
        Alert.alert('خطأ', 'المجموع النهائي لا يمكن أن يكون سالباً');
        return;
      }

      const payload = {
        storeId: store._id,
        customerId: selectedCustomer || undefined,
        items: receiptItems,
        discount: parseFloat(discount) || 0,
        total: total,
        pricePayed: parseFloat(pricePayed) || 0,
        receiptNumber: receiptNumber,
        lastEditDate: isEditing ? new Date() : undefined,
        addedBy: user?._id,
      };

      console.log('Saving receipt with payload:', payload);

      let response;
      if (isEditing && editingReceiptId) {
        // Update existing receipt
        response = await api.put(`/receipts/${editingReceiptId}`, payload);
        console.log('Receipt updated successfully:', response.data);
        Alert.alert('نجح', 'تم تحديث الفاتورة بنجاح', [
          {
            text: 'موافق',
            onPress: () => router.replace('/(tabs)/receipts'),
          }
        ]);
      } else {
        // Create new receipt
        // Check if receipt number already exists
        try {
          const existingReceipts = await api.get(`/receipts?receiptNumber=${receiptNumber}`);
          if (existingReceipts.data && existingReceipts.data.length > 0) {
            // Generate a new receipt number if it already exists
            const timestamp = Date.now();
            const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
            const newReceiptNumber = `RCP-${timestamp}-${randomPart}`;
            setReceiptNumber(newReceiptNumber);
            payload.receiptNumber = newReceiptNumber;
            Alert.alert('تنبيه', 'تم تحديث رقم الفاتورة لتجنب التكرار');
          }
        } catch (checkError) {
          console.warn('Could not check for duplicate receipt numbers:', checkError);
          // Continue with saving even if check fails
        }

        response = await api.post('/receipts', payload);
        console.log('Receipt saved successfully:', response.data);
        Alert.alert('نجح', 'تم إنشاء الفاتورة بنجاح', [
          {
            text: 'موافق',
            onPress: () => router.replace('/(tabs)/receipts'),
          }
        ]);
      }

      setShowReceiptModal(false);
    } catch (error: any) {
      console.error('Error saving receipt:', error);
      const errorMessage = error.response?.data?.error || error.message || 'فشل في حفظ الفاتورة';
      Alert.alert('خطأ', errorMessage);
    }
  };

  const generateReceiptHTML = () => {
    const currentDate = new Date();
    const dateStr = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    const customerName = selectedCustomer ? customers.find(c => c._id === selectedCustomer)?.name : 'عميل غير محدد';

    // Calculate totals within the function scope
    let subtotal = 0;
    Object.values(scannedItems).forEach(itemData => {
      const itemTotal = calculateItemTotal(itemData);
      subtotal += itemTotal;
    });
    const discountAmount = parseFloat(discount) || 0;
    const total = Math.max(0, subtotal - discountAmount);

    const itemsHTML = Object.entries(scannedItems).map(([itemId, itemData]) => {
      const unitsFromBoxes = (itemData.boxes || 0) * (itemData.item.unitsPerBox || 1);
      const totalUnits = (itemData.units || 0) + unitsFromBoxes;
      const itemTotal = totalUnits * itemData.unitPrice;

      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${itemData.item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${totalUnits}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${itemData.unitPrice.toFixed(2)} دج</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${itemTotal.toFixed(2)} دج</td>
        </tr>
      `;
    }).join('');

    const discountHTML = parseFloat(discount) > 0 ? `
      <tr>
        <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">الخصم:</td>
        <td style="padding: 8px; text-align: center; font-weight: bold;">-${parseFloat(discount).toFixed(2)} دج</td>
      </tr>
    ` : '';

    const changeHTML = parseFloat(pricePayed) > total ? `
      <tr>
        <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold; color: #28a745;">الباقي:</td>
        <td style="padding: 8px; text-align: center; font-weight: bold; color: #28a745;">${(parseFloat(pricePayed) - total).toFixed(2)} دج</td>
      </tr>
    ` : '';

    return `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>فاتورة ${receiptNumber}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            direction: rtl;
            margin: 0;
            padding: 20px;
            background-color: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .store-name {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin-bottom: 8px;
          }
          .store-info {
            font-size: 14px;
            color: #666;
            margin-bottom: 4px;
          }
          .receipt-info {
            margin-bottom: 30px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .info-label {
            font-weight: bold;
            color: #666;
          }
          .info-value {
            font-weight: bold;
            color: #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background-color: #f8f9fa;
            padding: 12px;
            text-align: center;
            font-weight: bold;
            border-bottom: 2px solid #ddd;
          }
          .product-header {
            text-align: right;
          }
          .totals {
            border-top: 2px solid #333;
            padding-top: 20px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 8px 0;
          }
          .final-total {
            background-color: #e8f5e8;
            padding: 12px;
            border-radius: 8px;
            margin: 8px 0;
            border: 1px solid #28a745;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .footer-text {
            font-size: 16px;
            color: #666;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .footer-subtext {
            font-size: 14px;
            color: #999;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">${store?.name || 'المتجر'}</div>
          <div class="store-info">${store?.address || 'العنوان'}</div>
          <div class="store-info">${store?.phone || 'الهاتف'}</div>
        </div>

        <div class="receipt-info">
          <div class="info-row">
            <span class="info-label">رقم الفاتورة:</span>
            <span class="info-value">${receiptNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">التاريخ:</span>
            <span class="info-value">${dateStr}</span>
          </div>
          <div class="info-row">
            <span class="info-label">العميل:</span>
            <span class="info-value">${customerName}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="product-header">المنتج</th>
              <th>الكمية</th>
              <th>السعر</th>
              <th>المجموع</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span style="font-weight: bold;">المجموع الفرعي:</span>
            <span>${subtotal.toFixed(2)} دج</span>
          </div>
          ${discountHTML}
          <div class="final-total">
            <div class="total-row" style="margin: 0;">
              <span style="font-weight: bold; font-size: 18px;">المجموع النهائي:</span>
              <span style="font-weight: bold; font-size: 18px; color: #28a745;">${total.toFixed(2)} دج</span>
            </div>
          </div>
          <div class="total-row">
            <span style="font-weight: bold;">المبلغ المدفوع:</span>
            <span>${parseFloat(pricePayed || '0').toFixed(2)} دج</span>
          </div>
          ${changeHTML}
        </div>

        <div class="footer">
          <div class="footer-text">شكراً لزيارتكم</div>
          <div class="footer-subtext">نتمنى أن نراكم مرة أخرى</div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintReceipt = async () => {
    try {
      const html = generateReceiptHTML();
      await Print.printAsync({
        html,
      });
    } catch (error) {
      console.error('Error printing receipt:', error);
      Alert.alert('خطأ', 'فشل في طباعة الفاتورة');
    }
  };

  const filteredCustomers = customers.filter(customer =>
    (customer.name?.toLowerCase() || '').includes(customerSearchQuery.toLowerCase()) ||
    (customer.phone && customer.phone.includes(customerSearchQuery))
  );

  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
    item.reference?.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
    itemSearchQuery === ''
  );

  const handleItemSelect = (item: Item) => {
    addItemToReceipt(item);
    setShowItemModal(false);
    setItemSearchQuery('');
    Alert.alert('نجح', `تم إضافة ${item.name} إلى الفاتورة`);
  };

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim() && !newCustomerPhone.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال اسم الزبون أو رقم الهاتف على الأقل');
      return;
    }

    try {
      const response = await api.post('/customers', {
        name: newCustomerName.trim() || undefined,
        phone: newCustomerPhone.trim() || undefined,
        storeId: store._id,
        addedBy: user?._id,
      });

      const newCustomer = response.data;
      setCustomers(prev => [...prev, newCustomer]);
      setSelectedCustomer(newCustomer._id);
      
      // Reset form and close modal
      setNewCustomerName('');
      setNewCustomerPhone('');
      setShowAddCustomerForm(false);
      
      Alert.alert('نجح', 'تم إضافة الزبون بنجاح');
    } catch (error: any) {
      console.error('Error adding customer:', error);
      Alert.alert('خطأ', error.response?.data?.error || 'فشل في إضافة الزبون');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!store) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>لم يتم العثور على متجر</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { subtotal, total } = calculateTotals();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'تعديل الفاتورة' : 'إضافة فاتورة'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Camera View - Fixed */}
        <View style={[styles.cameraSection, { height: cameraHeight }]}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame}>
              <View style={styles.scanCorner} />
              <View style={[styles.scanCorner, styles.topRight]} />
              <View style={[styles.scanCorner, styles.bottomLeft]} />
              <View style={[styles.scanCorner, styles.bottomRight]} />
            </View>
          </View>
        </View>

        {/* Drag Handle */}
        <View style={styles.dragHandle} {...panResponder.panHandlers}>
          <View style={styles.dragIndicator} />
        </View>

        {/* Scrollable Content - Items List */}
        <ScrollView
          style={styles.contentScrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={true}
          onScroll={(event) => {
            setScrollY(event.nativeEvent.contentOffset.y);
          }}
          scrollEventThrottle={16}
        >        {/* Scanned Items List */}
        <View style={styles.itemsSection}>
          {/* Customer Selection */}
          <View style={styles.customerSection}>
            {/* Customer Row - Search and Add Button */}
            <View style={styles.customerRow}>
              {/* Selected Customer / Search Bar */}
              <View style={styles.customerSearchWrapper}>
                {selectedCustomer && !customerSearchQuery ? (
                  <View style={styles.selectedCustomerDisplay}>
                    <Text style={styles.selectedCustomerName}>
                      {customers.find(c => c._id === selectedCustomer)?.name || 'زبون غير محدد'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSelectedCustomer('')}
                      style={styles.clearCustomerButton}
                    >
                      <Ionicons name="close-circle" size={18} color="#dc3545" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.customerSearchContainer}>
                    <Ionicons name="search" size={16} color="#666" />
                    <TextInput
                      style={styles.customerSearchInput}
                      value={customerSearchQuery}
                      onChangeText={setCustomerSearchQuery}
                      onFocus={() => setCustomerDropdownExpanded(true)}
                      placeholder="ابحث عن زبون..."
                      placeholderTextColor="#999"
                    />
                    {customerSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setCustomerSearchQuery('')}>
                        <Ionicons name="close-circle" size={16} color="#666" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Add Customer Button */}
              <TouchableOpacity
                style={styles.addCustomerButton}
                onPress={() => setShowAddCustomerForm(!showAddCustomerForm)}
              >
                <Ionicons 
                  name={showAddCustomerForm ? "close" : "add"} 
                  size={18} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>

            {/* Customer Search Results Dropdown */}
            {customerDropdownExpanded && customerSearchQuery.length > 0 && (
              <View style={styles.customerDropdown}>
                {filteredCustomers.length === 0 ? (
                  <View style={styles.noCustomersFound}>
                    <Ionicons name="search-outline" size={24} color="#ccc" />
                    <Text style={styles.noCustomersText}>لم يتم العثور على زبائن</Text>
                  </View>
                ) : (
                  <View style={styles.customerDropdownScroll}>
                    {filteredCustomers.map((customer) => (
                      <TouchableOpacity
                        key={customer._id}
                        style={[
                          styles.customerOption,
                          selectedCustomer === customer._id && styles.customerOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedCustomer(customer._id);
                          setCustomerDropdownExpanded(false);
                          setCustomerSearchQuery('');
                        }}
                      >
                        <Text style={[
                          styles.customerOptionText,
                          selectedCustomer === customer._id && styles.customerOptionTextSelected
                        ]}>
                          {customer.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
          {/* Item Search/Add Button */}
          <View style={styles.addItemSection}>
            <TouchableOpacity
              style={styles.addItemButton}
              onPress={() => setShowItemModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addItemButtonText}>إضافة منتج</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionTitle}>
            المنتجات ({Object.keys(scannedItems).length})
          </Text>

          {Object.keys(scannedItems).length === 0 ? (
            <View style={styles.emptyItems}>
              <Ionicons name="basket-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>لم يتم إضافة منتجات بعد</Text>
              <Text style={styles.emptySubtext}>امسح الباركود لإضافة المنتجات</Text>
            </View>
          ) : (
            Object.entries(scannedItems).map(([itemId, itemData]) => {
              const itemTotal = calculateItemTotal(itemData);
              const unitsFromBoxes = (itemData.boxes || 0) * (itemData.item.unitsPerBox || 1);
              const totalUnits = (itemData.units || 0) + unitsFromBoxes;
              const isExpanded = expandedItems.has(itemId);

              return (
                <View key={itemId} style={styles.itemCard}>
                  {/* Compact View - Always Visible */}
                  <TouchableOpacity
                    style={styles.itemCompactRow}
                    onPress={() => toggleItemExpansion(itemId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemCompactInfo}>
                      <Text style={styles.itemName}>{itemData.item.name}</Text>
                      <Text style={styles.itemCompactDetails}>
                        {totalUnits} وحدة • {itemTotal.toFixed(2)} دج
                      </Text>
                    </View>
                    <View style={styles.itemCompactActions}>
                      <Text style={styles.itemTotal}>{itemTotal.toFixed(2)} دج</Text>
                      <View style={styles.itemExpandIndicator}>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={16}
                          color="#666"
                        />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded View - Controls */}
                  {isExpanded && (
                    <View style={styles.itemExpandedContent}>
                      <View style={styles.itemHeader}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemReference}>المرجع: {itemData.item.reference}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeScannedItem(itemId)}
                        >
                          <Ionicons name="trash" size={20} color="#dc3545" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.itemControls}>
                        {/* Unit Price */}
                        <View style={styles.controlGroup}>
                          <Text style={styles.controlLabel}>سعر الوحدة</Text>
                          <View style={styles.inputWithIcon}>
                            <Ionicons name="cash-outline" size={16} color="#28a745" style={styles.inputIcon} />
                            <TextInput
                              style={[styles.priceInput, styles.priceInputColored]}
                              value={itemData.unitPrice.toString()}
                              onChangeText={(value) => updateScannedItem(itemId, { unitPrice: parseFloat(value) || 0 })}
                              keyboardType="numeric"
                              placeholder="0.00"
                            />
                          </View>
                        </View>

                        {/* Units */}
                        <View style={styles.controlGroup}>
                          <Text style={styles.controlLabel}>الوحدات</Text>
                          <View style={styles.inputWithIcon}>
                            <Ionicons name="apps-outline" size={16} color="#007AFF" style={styles.inputIcon} />
                            <TextInput
                              style={[styles.unitsInput, styles.unitsInputColored]}
                              value={itemData.units.toString()}
                              onChangeText={(value) => updateScannedItem(itemId, { units: parseInt(value) || 0 })}
                              keyboardType="numeric"
                              placeholder="0"
                            />
                          </View>
                        </View>

                        {/* Boxes */}
                        <View style={styles.controlGroup}>
                          <Text style={styles.controlLabel}>الصناديق</Text>
                          <View style={styles.inputWithIcon}>
                            <Ionicons name="cube-outline" size={16} color="#FF9500" style={styles.inputIcon} />
                            <TextInput
                              style={[styles.boxesInput, styles.boxesInputColored]}
                              value={itemData.boxes.toString()}
                              onChangeText={(value) => updateScannedItem(itemId, { boxes: parseInt(value) || 0 })}
                              keyboardType="numeric"
                              placeholder="0"
                            />
                          </View>
                        </View>
                      </View>

                      <View style={styles.itemSummary}>
                        <Text style={styles.itemUnits}>
                          إجمالي الوحدات: {totalUnits}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Extra space for fixed bottom section */}
        <View style={{ height: 20 }} />
        
      </ScrollView>

      {/* Fixed Bottom Receipt Section */}
      <View style={styles.fixedReceiptSection}>
        {/* Compact Receipt Summary */}
        <View style={styles.compactReceiptRow}>
          {/* Left side - Totals */}
          <View style={styles.compactTotalsColumn}>
            <View style={styles.compactRow}>
              <Text style={styles.compactLabel}>المجموع:</Text>
              <Text style={styles.compactValue}>{subtotal.toFixed(2)} دج</Text>
            </View>
            <View style={styles.compactRow}>
              <Text style={styles.compactLabel}>الخصم:</Text>
              <TextInput
                style={styles.compactInput}
                value={discount}
                onChangeText={setDiscount}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>

          {/* Middle - Final Total */}
          <View style={styles.compactTotalColumn}>
            <Text style={styles.compactTotalLabel}>الإجمالي</Text>
            <Text style={styles.compactTotalValue}>{total.toFixed(2)} دج</Text>
          </View>

          {/* Right side - Payment & Save */}
          <View style={styles.compactActionsColumn}>
            <View style={styles.compactRow}>
              <Text style={styles.compactLabel}>المدفوع:</Text>
              <TextInput
                style={styles.compactInput}
                value={pricePayed}
                onChangeText={setPricePayed}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <TouchableOpacity
              style={styles.compactSaveButton}
              onPress={handleSaveReceipt}
            >
              <Ionicons name="save" size={16} color="#fff" />
              <Text style={styles.compactSaveButtonText}>حفظ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Change notification if applicable */}
        {parseFloat(pricePayed) > total && (
          <View style={styles.changeNotification}>
            <Text style={styles.changeNotificationText}>
              الباقي: {(parseFloat(pricePayed) - total).toFixed(2)} دج
            </Text>
          </View>
        )}
      </View>

      {/* Floating Total Display - Shows when scrolled past receipt section */}
      {scrollY > 800 && Object.keys(scannedItems).length > 0 && (
        <View style={styles.floatingTotal}>
          <View style={styles.floatingTotalContent}>
            <Ionicons name="receipt-outline" size={16} color="#fff" />
            <View style={styles.floatingTotalText}>
              <Text style={styles.floatingTotalLabel}>المجموع</Text>
              <Text style={styles.floatingTotalValue}>{total.toFixed(2)} دج</Text>
            </View>
          </View>
        </View>
      )}

      </View>
      {/* End of innerContainer */}

      <Modal
        visible={showItemModal}
        onRequestClose={() => setShowItemModal(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowItemModal(false);
                setItemSearchQuery('');
              }}
            >
              <Text style={styles.closeButtonText}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>اختيار المنتج</Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                setShowItemModal(false);
                setItemSearchQuery('');
              }}
            >
              <Text style={styles.doneButtonText}>تم</Text>
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={itemSearchQuery}
              onChangeText={setItemSearchQuery}
              placeholder="البحث بالاسم أو المرجع..."
              placeholderTextColor="#999"
            />
            {itemSearchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setItemSearchQuery('')}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.itemsList}>
            {filteredItems.length === 0 ? (
              <View style={styles.emptySearch}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptySearchText}>
                  {itemSearchQuery.length > 0
                    ? 'لم يتم العثور على منتجات'
                    : 'ابدأ البحث عن المنتجات...'
                  }
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={true}>
                {filteredItems.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.itemOption}
                    onPress={() => handleItemSelect(item)}
                  >
                    <View style={styles.itemOptionContent}>
                      <Text style={styles.itemOptionName}>{item.name}</Text>
                      <Text style={styles.itemOptionReference}>المرجع: {item.reference}</Text>
                      <Text style={styles.itemOptionPrice}>
                        السعر: {item.price?.toFixed(2) || '0.00'} دج
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        visible={showAddCustomerForm}
        onRequestClose={() => {
          setShowAddCustomerForm(false);
          setNewCustomerName('');
          setNewCustomerPhone('');
        }}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={true}
      >
        <View style={styles.addCustomerModalOverlay}>
          <View style={styles.addCustomerModalContent}>
            <View style={styles.addCustomerModalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddCustomerForm(false);
                  setNewCustomerName('');
                  setNewCustomerPhone('');
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.addCustomerModalTitle}>إضافة زبون جديد</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.addCustomerModalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>اسم الزبون</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newCustomerName}
                  onChangeText={setNewCustomerName}
                  placeholder="أدخل اسم الزبون"
                  placeholderTextColor="#999"
                  autoFocus={true}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>رقم الهاتف</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newCustomerPhone}
                  onChangeText={setNewCustomerPhone}
                  placeholder="أدخل رقم الهاتف"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.validationNote}>* يجب إدخال الاسم أو رقم الهاتف على الأقل</Text>

              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleAddCustomer}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.modalSubmitButtonText}>حفظ الزبون</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Preview Modal */}
      <Modal
        visible={showReceiptModal}
        onRequestClose={() => setShowReceiptModal(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.receiptModalContainer}>
          <View style={styles.receiptModalHeader}>
            <TouchableOpacity
              style={styles.receiptModalCloseButton}
              onPress={() => setShowReceiptModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.receiptModalTitle}>معاينة الفاتورة</Text>
            <TouchableOpacity
              style={styles.receiptModalConfirmButton}
              onPress={handleConfirmSave}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.receiptModalConfirmText}>تأكيد</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.receiptPreviewScroll}>
            <View style={styles.receiptPreview}>
              {/* Store Header */}
              <View style={styles.receiptStoreHeader}>
                <Text style={styles.storeName}>{store?.name || 'المتجر'}</Text>
                <Text style={styles.storeAddress}>{store?.address || 'العنوان'}</Text>
                <Text style={styles.storePhone}>{store?.phone || 'الهاتف'}</Text>
              </View>

              {/* Receipt Info */}
              <View style={styles.receiptInfo}>
                <View style={styles.receiptInfoRow}>
                  <Text style={styles.receiptInfoLabel}>رقم الفاتورة:</Text>
                  <Text style={styles.receiptInfoValue}>{receiptNumber}</Text>
                </View>
                <View style={styles.receiptInfoRow}>
                  <Text style={styles.receiptInfoLabel}>التاريخ:</Text>
                  <Text style={styles.receiptInfoValue}>
                    {new Date().getDate()}/{new Date().getMonth() + 1}/{new Date().getFullYear()}
                  </Text>
                </View>
                <View style={styles.receiptInfoRow}>
                  <Text style={styles.receiptInfoLabel}>العميل:</Text>
                  <Text style={styles.receiptInfoValue}>
                    {selectedCustomer ? customers.find(c => c._id === selectedCustomer)?.name : 'عميل غير محدد'}
                  </Text>
                </View>
              </View>

              {/* Items Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.tableProduct]}>المنتج</Text>
                <Text style={[styles.tableHeaderText, styles.tableQty]}>الكمية</Text>
                <Text style={[styles.tableHeaderText, styles.tablePrice]}>السعر</Text>
                <Text style={[styles.tableHeaderText, styles.tableTotal]}>المجموع</Text>
              </View>

              {/* Items Table Body */}
              {Object.entries(scannedItems).map(([itemId, itemData]) => {
                const unitsFromBoxes = (itemData.boxes || 0) * (itemData.item.unitsPerBox || 1);
                const totalUnits = (itemData.units || 0) + unitsFromBoxes;
                const itemTotal = totalUnits * itemData.unitPrice;

                return (
                  <View key={itemId} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.tableProduct]}>{itemData.item.name}</Text>
                    <Text style={[styles.tableCell, styles.tableQty]}>{totalUnits}</Text>
                    <Text style={[styles.tableCell, styles.tablePrice]}>{itemData.unitPrice.toFixed(2)}</Text>
                    <Text style={[styles.tableCell, styles.tableTotal]}>{itemTotal.toFixed(2)}</Text>
                  </View>
                );
              })}

              
            </View>
          </ScrollView>
{/* Totals Section */}
              <View style={styles.receiptTotals}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>المجموع الفرعي:</Text>
                  <Text style={styles.totalValue}>{subtotal.toFixed(2)} دج</Text>
                </View>
                {parseFloat(discount) > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>الخصم:</Text>
                    <Text style={styles.totalValue}>-{parseFloat(discount).toFixed(2)} دج</Text>
                  </View>
                )}
                <View style={[styles.totalRow, styles.finalTotalRowPreview]}>
                  <Text style={styles.finalTotalLabelPreview}>المجموع النهائي:</Text>
                  <Text style={styles.finalTotalValuePreview}>{total.toFixed(2)} دج</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>المبلغ المدفوع:</Text>
                  <Text style={styles.totalValue}>{parseFloat(pricePayed || '0').toFixed(2)} دج</Text>
                </View>
                {parseFloat(pricePayed) > total && (
                  <View style={[styles.totalRow, styles.changeRowPreview]}>
                    <Text style={styles.changeLabelPreview}>الباقي:</Text>
                    <Text style={styles.changeValuePreview}>{(parseFloat(pricePayed) - total).toFixed(2)} دج</Text>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={styles.receiptPreviewFooter}>
                <Text style={styles.receiptPreviewFooterText}>شكراً لزيارتكم</Text>
                <Text style={styles.receiptPreviewFooterSubtext}>نتمنى أن نراكم مرة أخرى</Text>
              </View>
          {/* Action Buttons */}
          <View style={styles.receiptActionButtons}>
            <TouchableOpacity
              style={styles.printButton}
              onPress={handlePrintReceipt}
            >
              <Ionicons name="print-outline" size={20} color="#fff" />
              <Text style={styles.printButtonText}>طباعة الفاتورة</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButtonModal}
              onPress={handleConfirmSave}
            >
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonModalText}>حفظ الفاتورة</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  innerContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  cameraSection: {
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#fff',
    borderWidth: 3,
    top: '30%',
    left: '20%',
  },
  topRight: {
    top: '30%',
    right: '20%',
    left: undefined,
    borderTopWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 3,
  },
  bottomLeft: {
    top: '70%',
    left: '20%',
    borderTopWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderLeftWidth: 0,
  },
  bottomRight: {
    top: '70%',
    right: '20%',
    left: undefined,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  dragHandle: {
    height: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
  },
  keyboardAvoidingView: {
    marginBottom: 50,
    flex: 1,
  },
  contentScrollView: {
    flex: 1,
    marginBottom: 120,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  scannerSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemsSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    marginTop: 5,
    padding: 16,
    paddingTop: 5,
    paddingBottom: 0,
    borderRadius: 8,
  },
  emptyItems: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  itemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemCompactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCompactInfo: {
    flex: 1,
  },
  itemCompactDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemCompactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemExpandIndicator: {
    padding: 4,
  },
  itemExpandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  itemReference: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    padding: 4,
  },
  itemControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  controlGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  controlLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  priceInputColored: {
    borderColor: '#28a745',
    borderWidth: 2,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: '#fff',
    textAlign: 'center',
    minWidth: 40,
    marginHorizontal: 8,
  },
  boxesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  boxesInputColored: {
    borderColor: '#FF9500',
    borderWidth: 2,
  },
  unitsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  unitsInputColored: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 6,
  },
  itemSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
  },
  itemUnits: {
    fontSize: 12,
    color: '#666',
  },
  customerSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerSearchWrapper: {
    flex: 1,
  },
  selectedCustomerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  selectedCustomerName: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  clearCustomerButton: {
    padding: 2,
    marginLeft: 4,
  },
  customerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 6,
  },
  customerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    padding: 0,
  },
  addCustomerButton: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  addCustomerForm: {
    marginTop: 8,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  customerFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerFormInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#333',
    textAlign: 'right',
  },
  customerFormInputName: {
    flex: 2,
  },
  customerFormInputPhone: {
    flex: 1.5,
  },
  submitCustomerButton: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  noCustomersFound: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noCustomersText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  customerDropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    marginTop: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  customerDropdownScroll: {
    maxHeight: 180,
  },
  totalsSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 80,
    padding: 16,
    borderRadius: 8,
  },
  receiptSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  receiptBody: {
    padding: 12,
    backgroundColor: '#fafafa',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 28,
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#e8f5e8',
    borderRadius: 6,
    paddingHorizontal: 6,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  receiptLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
    flex: 1,
  },
  receiptValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 70,
  },
  dottedLine: {
    height: 1,
    backgroundColor: 'transparent',
    borderStyle: 'dotted',
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 4,
  },
  solidLine: {
    height: 2,
    backgroundColor: '#333',
    marginVertical: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 90,
    justifyContent: 'space-between',
    flex: 1,
    maxWidth: 120,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  discountContainer: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  paymentContainer: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  changeRow: {
    backgroundColor: '#f0fff0',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  currencyText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  discountInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    paddingVertical: 2,
  },
  paymentInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    paddingVertical: 2,
  },
  finalTotalLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    flex: 1,
  },
  finalTotalValue: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: 'bold',
    textAlign: 'right',
    minWidth: 70,
  },
  changeLabel: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    flex: 1,
  },
  changeValue: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: 'bold',
    textAlign: 'right',
    minWidth: 70,
  },
  receiptFooter: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  doneButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  customersList: {
    flex: 1,
    padding: 16,
  },
  customerOption: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  customerOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  customerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  customerOptionTextSelected: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  addItemSection: {
    marginBottom: 8,
  },
  addItemButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addItemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  clearButton: {
    padding: 4,
  },
  itemsList: {
    flex: 1,
    padding: 16,
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptySearchText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  itemOption: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemOptionContent: {
    flex: 1,
  },
  itemOptionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemOptionReference: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemOptionPrice: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
  },
  headerRight: {
    width: 50,
  },
  saveButtonContainer: {
    margin: 16,
    marginBottom: 30,
  },
  saveButtonLarge: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonLargeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  receiptModalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  receiptModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  receiptModalCloseButton: {
    padding: 8,
  },
  receiptModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  receiptModalConfirmButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  receiptModalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  receiptPreviewScroll: {
    flex: 1,
  },
  receiptPreview: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  receiptStoreHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  storeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  storePhone: {
    fontSize: 14,
    color: '#666',
  },
  receiptInfo: {
    marginBottom: 20,
  },
  receiptInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  receiptInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderRadius: 6,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  tableProduct: {
    flex: 2,
    textAlign: 'right',
  },
  tableQty: {
    flex: 1,
  },
  tablePrice: {
    flex: 1,
  },
  tableTotal: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  receiptTotals: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  finalTotalRowPreview: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  finalTotalLabelPreview: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  finalTotalValuePreview: {
    fontSize: 18,
    color: '#28a745',
    fontWeight: 'bold',
  },
  changeRowPreview: {
    backgroundColor: '#f0fff0',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  changeLabelPreview: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: '600',
  },
  changeValuePreview: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: 'bold',
  },
  receiptPreviewFooter: {
    marginTop: 20,
    paddingTop: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  receiptPreviewFooterText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  receiptPreviewFooterSubtext: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  receiptActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  printButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  printButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonModal: {
    flex: 1,
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonModalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addCustomerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addCustomerModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addCustomerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addCustomerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addCustomerModalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    textAlign: 'right',
  },
  validationNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'right',
    marginBottom: 8,
  },
  modalSubmitButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  modalSubmitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  floatingTotal: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: '#28a745',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    minWidth: 120,
  },
  floatingTotalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingTotalText: {
    flex: 1,
  },
  floatingTotalLabel: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'right',
  },
  floatingTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  fixedReceiptSection: {
    position: 'absolute',
    bottom: 75,
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderTopColor: '#e0e0e0',
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  compactReceiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  compactTotalsColumn: {
    flex: 1,
    gap: 6,
  },
  compactTotalColumn: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactActionsColumn: {
    flex: 1,
    gap: 6,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  compactLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  compactValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: 'bold',
  },
  compactInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    minWidth: 50,
    flex: 1,
  },
  compactTotalLabel: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.9,
  },
  compactTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  compactSaveButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  compactSaveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  changeNotification: {
    backgroundColor: '#e8f5e8',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 6,
    alignItems: 'center',
  },
  changeNotificationText: {
    fontSize: 11,
    color: '#28a745',
    fontWeight: 'bold',
  },
});