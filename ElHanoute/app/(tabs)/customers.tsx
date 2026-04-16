import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Modal,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/api';
import SwipeableCard, { SwipeAction } from '../../components/SwipeableCard';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
interface Customer {
  _id: string;
  name: string;
  lastname: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfAdding: string;
}

export default function CustomersScreen() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [customerReceipts, setCustomerReceipts] = useState<any[]>([]);
  const [selectedCustomerForReceipts, setSelectedCustomerForReceipts] = useState<Customer | null>(null);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allStoreReceipts, setAllStoreReceipts] = useState<any[]>([]);

  // Form state for adding customer
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    lastname: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, [user]);

  const fetchCustomers = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // First get the user's store
      const storesResponse = await api.get('/stores');
      const stores = storesResponse.data;
      const userStore = stores.find((store: any) => store.ownerId._id === user._id);

      if (!userStore) {
        setLoading(false);
        return;
      }

      // Get customers for this store
      const customersResponse = await api.get(`/customers?storeId=${userStore._id}`);
      setCustomers(customersResponse.data);

      // Get all receipts for this store
      const receiptsResponse = await api.get(`/receipts?storeId=${userStore._id}`);
      setAllStoreReceipts(receiptsResponse.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      Alert.alert('خطأ', 'فشل في تحميل الزبائن');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    (customer.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (customer.lastname?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (customer.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchQuery))
  );

  const deleteCustomer = async (customerId: string, customerName: string) => {
    Alert.alert(
      'حذف العميل',
      `هل أنت متأكد من حذف "${customerName}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/customers/${customerId}`);
              setCustomers(prev => prev.filter(customer => customer._id !== customerId));
              Alert.alert('نجح', 'تم حذف العميل بنجاح');
            } catch (error: any) {
              console.error('Error deleting customer:', error);
              Alert.alert('خطأ', error.response?.data?.error || 'فشل في حذف العميل');
            }
          }
        }
      ]
    );
  };

  const startEditingCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowEditModal(true);
  };

  const updateCustomer = async () => {
    if (!editingCustomer) return;

    // Validation - only name is required
    if (!editingCustomer.name.trim()) {
      Alert.alert('خطأ', 'اسم العميل مطلوب');
      return;
    }

    try {
      const updateData = {
        name: editingCustomer.name.trim(),
        lastname: editingCustomer.lastname.trim(),
        email: editingCustomer.email.trim(),
        phone: editingCustomer.phone?.trim() || '',
        address: editingCustomer.address?.trim() || '',
      };

      const response = await api.put(`/customers/${editingCustomer._id}`, updateData);
      const updatedCustomer = response.data;

      // Update the customer in the local state
      setCustomers(prev => prev.map(customer =>
        customer._id === editingCustomer._id ? updatedCustomer : customer
      ));

      setEditingCustomer(null);
      setShowEditModal(false);
      Alert.alert('نجح', 'تم تحديث العميل بنجاح');
    } catch (error: any) {
      console.error('Error updating customer:', error);
      Alert.alert('خطأ', error.response?.data?.error || 'فشل في تحديث العميل');
    }
  };

  const addCustomer = async () => {
    // Validation - only name is required
    if (!newCustomer.name.trim()) {
      Alert.alert('خطأ', 'اسم العميل مطلوب');
      return;
    }

    try {
      // Get the user's store
      const storesResponse = await api.get('/stores');
      const stores = storesResponse.data;
      const userStore = stores.find((store: any) => store.ownerId._id === user?._id);

      if (!userStore) {
        Alert.alert('خطأ', 'لم يتم العثور على المتجر');
        return;
      }

      const customerData = {
        ...newCustomer,
        storeId: userStore._id,
        name: newCustomer.name.trim(),
        lastname: newCustomer.lastname.trim(),
        email: newCustomer.email.trim(),
        phone: newCustomer.phone.trim(),
        address: newCustomer.address.trim(),
      };

      const response = await api.post('/customers', customerData);
      const addedCustomer = response.data;

      setCustomers(prev => [...prev, addedCustomer]);
      setNewCustomer({
        name: '',
        lastname: '',
        email: '',
        phone: '',
        address: '',
      });
      setShowAddModal(false);
      Alert.alert('نجح', 'تم إضافة العميل بنجاح');
    } catch (error: any) {
      console.error('Error adding customer:', error);
      Alert.alert('خطأ', error.response?.data?.error || 'فشل في إضافة العميل');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const fetchCustomerReceipts = async (customerId: string) => {
    try {
      setLoadingReceipts(true);

      // First get the user's store
      const storesResponse = await api.get('/stores');
      const stores = storesResponse.data;
      const userStore = stores.find((store: any) => store.ownerId._id === user?._id);

      if (!userStore) {
        setCustomerReceipts([]);
        return;
      }

      // Fetch receipts for this store
      const response = await api.get(`/receipts?storeId=${userStore._id}`);
      const storeReceipts = response.data;

      // Filter receipts for this customer
      const customerReceiptsData = storeReceipts.filter((receipt: any) => {
        // Handle both populated object and string ID cases
        const receiptCustomerId = typeof receipt.customerId === 'object' ? receipt.customerId?._id : receipt.customerId;
        return receiptCustomerId === customerId;
      });

      setCustomerReceipts(customerReceiptsData);
    } catch (error) {
      console.error('Error fetching customer receipts:', error);
      Alert.alert('خطأ', 'فشل في تحميل فواتير العميل');
    } finally {
      setLoadingReceipts(false);
    }
  };

  const markReceiptAsPaid = async (receiptId: string, total: number) => {
    try {
      await api.put(`/receipts/${receiptId}`, {
        pricePayed: total
      });
      // Refresh the receipts data
      const customer = selectedCustomerForReceipts;
      if (customer) {
        await fetchCustomerReceipts(customer._id);
      }
      // Refresh all store receipts to update customer debt calculations
      await fetchCustomers();
      Alert.alert('نجح', 'تم تسوية الفاتورة بنجاح');
    } catch (error: any) {
      console.error('Error marking receipt as paid:', error);
      Alert.alert('خطأ', error.response?.data?.error || 'فشل في تسوية الفاتورة');
    }
  };

  const handleCustomerPress = (customer: Customer) => {
    setSelectedCustomerForReceipts(customer);
    setShowReceiptsModal(true);
    fetchCustomerReceipts(customer._id);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>جاري التحقق من الهوية...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.logo}
        />
        <Text style={styles.headerTitle}>قائمة الزبائن</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="البحث في الزبائن بالاسم أو البريد الإلكتروني أو الهاتف..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Results Count */}
        {searchQuery.length > 0 && (
          <Text style={styles.resultsCount}>
            {filteredCustomers.length.toLocaleString('en-US')} من {customers.length.toLocaleString('en-US')} زبون
          </Text>
        )}

        {/* Customers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>الزبائن ({customers.length.toLocaleString('en-US')})</Text>
          </View>

          {filteredCustomers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery.length > 0 ? 'لا توجد زبائن مطابقة للبحث' : 'لا يوجد زبائن في المتجر'}
              </Text>
            </View>
          ) : (
            filteredCustomers.map((customer) => {
              // Calculate customer debt
              const customerDebt = (() => {
                // Get all receipts for this customer from the store receipts
                const receiptsForCustomer = allStoreReceipts.filter((receipt: any) => {
                  const receiptCustomerId = typeof receipt.customerId === 'object' ? receipt.customerId?._id : receipt.customerId;
                  return receiptCustomerId === customer._id;
                });

                // Calculate valid receipts only
                const validReceipts = receiptsForCustomer.filter((receipt: any) => {
                  const total = receipt.total || 0;
                  const pricePayed = receipt.pricePayed || 0;
                  return total > 0 && pricePayed >= 0;
                });

                return validReceipts.reduce((sum: number, receipt: any) => {
                  const receiptTotal = receipt.total || 0;
                  const pricePayed = receipt.pricePayed || 0;
                  return sum + (receiptTotal - pricePayed);
                }, 0);
              })();

              const actions: SwipeAction[] = [
                {
                  key: 'edit',
                  icon: <FontAwesome6 name="edit" size={20} color="#0056CC" />,
                  backgroundColor: '#e3f2fd',
                  onPress: () => startEditingCustomer(customer),
                },
                {
                  key: 'delete',
                  icon: <Feather name="trash" size={20} color="#B22222" />,
                  backgroundColor: '#ffebee',
                  onPress: () => deleteCustomer(customer._id, `${customer.name} ${customer.lastname}`),
                },
              ];

              return (
                <SwipeableCard key={customer._id} actions={actions}>
                  <TouchableOpacity
                    style={styles.customerCard}
                    onPress={() => handleCustomerPress(customer)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.customerInfo}>
                      {/* Always visible: Name and Phone */}
                      <View style={styles.customerMainInfo}>
                        <Text style={styles.customerName}>
                          {customer.name} {customer.lastname}
                        </Text>
                        {customer.phone && (
                          <Text style={styles.customerPhone}>
                            الهاتف: {customer.phone}
                          </Text>
                        )}
                      </View>

                      {/* Customer Debt */}
                      <View style={styles.customerDebtContainer}>
                        <Text style={styles.customerDebtLabel}>
                          {customerDebt > 0 ? 'مستحق عليه' : customerDebt < 0 ? 'رصيد له' : 'حساب مسدد'}
                        </Text>
                        <Text style={[
                          styles.customerDebtAmount,
                          {
                            color: customerDebt > 0 ? '#dc3545' : customerDebt < 0 ? '#28a745' : '#666'
                          }
                        ]}>
                          {Math.abs(customerDebt).toLocaleString('en-US')} دج
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </SwipeableCard>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Add Customer Modal */}
      <Modal
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.closeButtonText}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>إضافة عميل جديد</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={addCustomer}
            >
              <Text style={styles.saveButtonText}>حفظ</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>الاسم الأول *</Text>
              <TextInput
                style={styles.modalInput}
                value={newCustomer.name}
                onChangeText={(value) => setNewCustomer(prev => ({ ...prev, name: value }))}
                placeholder="أدخل الاسم الأول"
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>اللقب</Text>
              <TextInput
                style={styles.modalInput}
                value={newCustomer.lastname}
                onChangeText={(value) => setNewCustomer(prev => ({ ...prev, lastname: value }))}
                placeholder="أدخل اللقب"
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>البريد الإلكتروني</Text>
              <TextInput
                style={styles.modalInput}
                value={newCustomer.email}
                onChangeText={(value) => setNewCustomer(prev => ({ ...prev, email: value }))}
                placeholder="customer@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>الهاتف</Text>
              <TextInput
                style={styles.modalInput}
                value={newCustomer.phone}
                onChangeText={(value) => setNewCustomer(prev => ({ ...prev, phone: value }))}
                placeholder="+213 XX XX XX XX"
                keyboardType="phone-pad"
                maxLength={20}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>العنوان</Text>
              <TextInput
                style={styles.modalInput}
                value={newCustomer.address}
                onChangeText={(value) => setNewCustomer(prev => ({ ...prev, address: value }))}
                placeholder="أدخل العنوان الكامل"
                multiline
                maxLength={200}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        visible={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.closeButtonText}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>تعديل العميل</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={updateCustomer}
            >
              <Text style={styles.saveButtonText}>حفظ</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {editingCustomer && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>الاسم الأول *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingCustomer.name}
                    onChangeText={(value) => setEditingCustomer(prev => prev ? { ...prev, name: value } : null)}
                    placeholder="أدخل الاسم الأول"
                    maxLength={50}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>اللقب</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingCustomer.lastname}
                    onChangeText={(value) => setEditingCustomer(prev => prev ? { ...prev, lastname: value } : null)}
                    placeholder="أدخل اللقب"
                    maxLength={50}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>البريد الإلكتروني</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingCustomer.email}
                    onChangeText={(value) => setEditingCustomer(prev => prev ? { ...prev, email: value } : null)}
                    placeholder="customer@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    maxLength={100}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>الهاتف</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingCustomer.phone || ''}
                    onChangeText={(value) => setEditingCustomer(prev => prev ? { ...prev, phone: value } : null)}
                    placeholder="+213 XX XX XX XX"
                    keyboardType="phone-pad"
                    maxLength={20}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>العنوان</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingCustomer.address || ''}
                    onChangeText={(value) => setEditingCustomer(prev => prev ? { ...prev, address: value } : null)}
                    placeholder="أدخل العنوان الكامل"
                    multiline
                    maxLength={200}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Customer Receipts Modal */}
      <Modal
        visible={showReceiptsModal}
        onRequestClose={() => setShowReceiptsModal(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowReceiptsModal(false)}
            >
              <Text style={styles.closeButtonText}>إغلاق</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              فواتير {selectedCustomerForReceipts ? `${selectedCustomerForReceipts.name} ${selectedCustomerForReceipts.lastname}` : ''}
            </Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {loadingReceipts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>جاري تحميل الفواتير...</Text>
              </View>
            ) : customerReceipts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>لا توجد فواتير لهذا العميل</Text>
              </View>
            ) : (
              <>
                {/* Customer Balance Summary */}
                <View style={styles.balanceSummary}>
                  {(() => {
                    // Separate valid and invalid receipts
                    const validReceipts = customerReceipts.filter((receipt: any) => {
                      const total = receipt.total || 0;
                      const pricePayed = receipt.pricePayed || 0;
                      // Valid if total > 0 and pricePayed >= 0
                      return total > 0 && pricePayed >= 0;
                    });

                    const invalidReceipts = customerReceipts.filter((receipt: any) => {
                      const total = receipt.total || 0;
                      const pricePayed = receipt.pricePayed || 0;
                      return !(total > 0 && pricePayed >= 0);
                    });

                    const totalOwed = validReceipts.reduce((sum: number, receipt: any) => {
                      const receiptTotal = receipt.total || 0;
                      const pricePayed = receipt.pricePayed || 0;
                      return sum + (receiptTotal - pricePayed);
                    }, 0);

                    return (
                      <>
                        <Text style={styles.balanceTitle}>ملخص الحساب</Text>
                        <Text style={[
                          styles.balanceAmount,
                          { color: totalOwed > 0 ? '#dc3545' : totalOwed < 0 ? '#28a745' : '#666' }
                        ]}>
                          {totalOwed > 0 ? 'مبلغ مستحق عليه' : totalOwed < 0 ? 'رصيد له' : 'حساب مسدد'}
                        </Text>
                        <Text style={[
                          styles.balanceValue,
                          { color: totalOwed > 0 ? '#dc3545' : totalOwed < 0 ? '#28a745' : '#666' }
                        ]}>
                          {Math.abs(totalOwed).toLocaleString('en-US')} دج
                        </Text>
                        {invalidReceipts.length > 0 && (
                          <Text style={styles.invalidReceiptsWarning}>
                            {invalidReceipts.length} فاتورة غير صالحة مستثناة من الحساب
                          </Text>
                        )}
                      </>
                    );
                  })()}
                </View>

                {/* Receipts List */}
                {customerReceipts.map((receipt) => {
                  const total = receipt.total || 0;
                  const pricePayed = receipt.pricePayed || 0;
                  const isValid = total > 0 && pricePayed >= 0;
                  const remaining = total - pricePayed;
                  const hasOutstandingBalance = isValid && remaining > 0;

                  return (
                    <View key={receipt._id} style={[
                      styles.receiptCard,
                      !isValid && styles.invalidReceiptCard
                    ]}>
                      {!isValid && (
                        <View style={styles.invalidReceiptBadge}>
                          <Text style={styles.invalidReceiptBadgeText}>فاتورة غير صالحة</Text>
                        </View>
                      )}

                      <View style={styles.receiptCardContent}>
                        {/* Left side - Receipt details */}
                        <View style={styles.receiptInfo}>
                          <View style={styles.receiptHeader}>
                            <Text style={styles.receiptId}>فاتورة #{receipt._id.slice(-8)}</Text>
                            <Text style={styles.receiptDate}>
                              {formatDate(receipt.createdAt || receipt.dateOfAdding || Date.now())}
                            </Text>
                          </View>

                          <View style={styles.receiptAmounts}>
                            <View style={styles.amountRow}>
                              <Text style={styles.amountLabel}>المجموع:</Text>
                              <Text style={styles.receiptTotal}>
                                {(receipt.total || 0).toLocaleString('en-US')} دج
                              </Text>
                            </View>

                            <View style={styles.amountRow}>
                              <Text style={styles.amountLabel}>المدفوع:</Text>
                              <Text style={styles.receiptPaid}>
                                {(receipt.pricePayed || 0).toLocaleString('en-US')} دج
                              </Text>
                            </View>

                            {remaining !== 0 && (
                              <View style={styles.amountRow}>
                                <Text style={styles.amountLabel}>
                                  {remaining > 0 ? 'متبقي:' : 'زيادة:'}
                                </Text>
                                <Text style={[
                                  styles.receiptRemaining,
                                  { color: remaining > 0 ? '#dc3545' : '#28a745' }
                                ]}>
                                  {Math.abs(remaining).toLocaleString('en-US')} دج
                                </Text>
                              </View>
                            )}

                            {receipt.discount > 0 && (
                              <View style={styles.amountRow}>
                                <Text style={styles.amountLabel}>الخصم:</Text>
                                <Text style={styles.receiptDiscount}>
                                  {receipt.discount.toLocaleString('en-US')} دج
                                </Text>
                              </View>
                            )}

                            <View style={styles.amountRow}>
                              <Text style={styles.amountLabel}>المنتجات:</Text>
                              <Text style={styles.receiptItems}>
                                {receipt.items?.length || 0}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Right side - Action button */}
                        {hasOutstandingBalance && (
                          <View style={styles.receiptActions}>
                            <TouchableOpacity
                              style={styles.markAsPaidButton}
                              onPress={() => markReceiptAsPaid(receipt._id, receipt.total || 0)}
                            >
                              <Text style={styles.markAsPaidButtonText}>تسوية</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
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
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logo: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'NotoSansArabic-Bold',
  },
  addButton: {
    backgroundColor: '#28a745',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
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
    fontFamily: 'NotoSansArabic-Regular',
  },
  searchContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
    fontFamily: 'NotoSansArabic-Regular',
  },
  clearButton: {
    marginLeft: 12,
    padding: 4,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'NotoSansArabic-Regular',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'NotoSansArabic-Bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'NotoSansArabic-Regular',
    textAlign: 'center',
  },
  customerCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  customerInfo: {
    flex: 1,
  },
  customerMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'NotoSansArabic-Bold',
    flex: 1,
  },
  customerEmail: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
    fontFamily: 'NotoSansArabic-Regular',
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'NotoSansArabic-Regular',
  },
  customerDebtContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  customerDebtLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'NotoSansArabic-Regular',
  },
  customerDebtAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'NotoSansArabic-Bold',
  },
  customerAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'NotoSansArabic-Regular',
  },
  customerDate: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'NotoSansArabic-Regular',
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
    fontFamily: 'NotoSansArabic-Regular',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'NotoSansArabic-Bold',
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
    fontFamily: 'NotoSansArabic-Bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'NotoSansArabic-Bold',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    fontFamily: 'NotoSansArabic-Regular',
  },
  receiptCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  receiptCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptInfo: {
    flex: 1,
  },
  receiptAmounts: {
    marginTop: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'NotoSansArabic-Regular',
  },
  receiptActions: {
    marginLeft: 16,
  },
  receiptHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  receiptId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'NotoSansArabic-Bold',
  },
  receiptDate: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'NotoSansArabic-Regular',
  },
  receiptDetails: {
    marginBottom: 10,
  },
  receiptTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 4,
    fontFamily: 'NotoSansArabic-Bold',
  },
  receiptDiscount: {
    fontSize: 14,
    color: '#ff6b35',
    marginBottom: 4,
    fontFamily: 'NotoSansArabic-Regular',
  },
  receiptItems: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'NotoSansArabic-Regular',
  },
  balanceSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    fontFamily: 'NotoSansArabic-Bold',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    fontFamily: 'NotoSansArabic-Bold',
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'NotoSansArabic-Bold',
  },
  invalidReceiptsWarning: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 8,
    fontFamily: 'NotoSansArabic-Regular',
    textAlign: 'center',
  },
  receiptPaid: {
    fontSize: 14,
    color: '#28a745',
    marginBottom: 4,
    fontFamily: 'NotoSansArabic-Regular',
  },
  receiptRemaining: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'NotoSansArabic-Bold',
  },
  invalidReceiptCard: {
    borderColor: '#dc3545',
    borderWidth: 2,
    backgroundColor: '#fff5f5',
  },
  invalidReceiptBadge: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  invalidReceiptBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'NotoSansArabic-Bold',
  },
  markAsPaidButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  markAsPaidButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'NotoSansArabic-Bold',
  },
});