import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Print from 'expo-print';

import api from '../../src/api';
import { useAuth } from '../../src/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const formatDate = (date: Date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function ReceiptsScreen() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const router = useRouter();

  // User role and permissions state
  const [store, setStore] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<any>(null);

  const fetchReceipts = async () => {
    if (!store) return;

    try {
      setLoading(true);
      const response = await api.get('/receipts');
      const allReceipts = response.data;
      // Filter receipts to only show those from the user's store
      const storeReceipts = allReceipts.filter((receipt: any) => receipt.storeId === store._id);
      setReceipts(storeReceipts);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      Alert.alert('خطأ', 'فشل في تحميل الفواتير');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStore = async () => {
    if (!user) {
      console.log('No user found, setting loading to false');
      setLoading(false);
      return;
    }

    try {
      // Try to get cached store data first
      const cachedStoreData = await AsyncStorage.getItem(`store_${user._id}`);
      let userStore = null;
      let userRoleCached = null;

      if (cachedStoreData) {
        const parsed = JSON.parse(cachedStoreData);
        // Check if cache is still valid (less than 1 hour old)
        if (Date.now() - parsed.timestamp < 3600000) {
          userStore = parsed.store;
          userRoleCached = parsed.role;
          console.log('Using cached store data:', userStore._id);
        }
      }

      // If no valid cache, fetch fresh data
      if (!userStore) {
        console.log('Fetching fresh store data...');
        const response = await api.get('/stores');
        const stores: any[] = response.data;
        console.log('All stores:', stores.map(s => ({ id: s._id, owner: s.ownerId._id, workers: s.workers.map((w: any) => w.userId) })));
        
        // First check if user is owner of any store
        const ownedStore = stores.find(store => store.ownerId._id === user._id);
        if (ownedStore) {
          console.log('User is owner of store:', ownedStore._id);
          userStore = ownedStore;
          userRoleCached = 'owner';
          console.log('Owner store loaded successfully');
        } else {
          // Check if user is in workers array of any store
          const workerStore = stores.find(store => 
            store.workers.some((worker: any) => 
              (typeof worker.userId === 'object' ? worker.userId._id : worker.userId) === user._id
            )
          );
          
          if (workerStore) {
            console.log('User is worker in store:', workerStore._id);
            userStore = workerStore;
            // Find the worker's position/role
            const workerInfo = workerStore.workers.find((worker: any) => 
              (typeof worker.userId === 'object' ? worker.userId._id : worker.userId) === user._id
            );
            userRoleCached = workerInfo?.position || 'employee';
            console.log('Worker store loaded successfully, role:', workerInfo?.position);
          } else {
            // Check legacy user.stores array (for backward compatibility)
            if ((user as any).stores && (user as any).stores.length > 0) {
              console.log('User has stores array (legacy):', (user as any).stores);
              const storeId = (user as any).stores[0].store;
              const legacyStore = stores.find(s => s._id === storeId);
              if (legacyStore) {
                userStore = legacyStore;
                userRoleCached = (user as any).stores[0].role;
                console.log('Legacy store loaded successfully');
              }
            }
          }
        }

        // Cache the store data if found
        if (userStore) {
          await AsyncStorage.setItem(`store_${user._id}`, JSON.stringify({
            store: userStore,
            role: userRoleCached,
            timestamp: Date.now()
          }));
        }
      }

      if (userStore) {
        setStore(userStore);
        setUserRole(userRoleCached);
      } else {
        console.log('User is neither owner nor worker in any store - no store access');
        setStore(null);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      Alert.alert('خطأ', 'فشل في تحميل معلومات المتجر');
    }
  };

  const fetchUserRole = async () => {
    if (!store || !user) return;

    try {
      const response = await api.get(`/roles?storeId=${store._id}`);
      const roles = response.data;
      // Find role that has user in users array
      const userRoleData = roles.find((role: any) => role.users.includes(user._id));
      if (userRoleData) {
        setUserPermissions(userRoleData.permissions);
      } else {
        // Default permissions for owner
        setUserPermissions({
          viewingAllReceipts: true,
          deletingReceipts: true,
          editingReceipts: true,
        });
      }
    } catch (error) {
      console.error('Error fetching role:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchUserStore();
    }, [user])
  );

  useEffect(() => {
    if (store) {
      fetchUserRole();
      fetchReceipts();
    }
  }, [store]);

  const handleDeleteReceipt = async (receiptId: string) => {
    Alert.alert(
      'حذف الفاتورة',
      'هل أنت متأكد من حذف هذه الفاتورة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/receipts/${receiptId}`);
              setReceipts(receipts.filter(r => r._id !== receiptId));
              Alert.alert('نجح', 'تم حذف الفاتورة بنجاح');
            } catch (error) {
              console.error('Error deleting receipt:', error);
              Alert.alert('خطأ', 'فشل في حذف الفاتورة');
            }
          },
        },
      ]
    );
  };

  const handleViewReceipt = (receipt: any) => {
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  const handlePrintReceipt = async () => {
    if (!selectedReceipt) return;

    try {
      const html = generateReceiptHTML(selectedReceipt);
      await Print.printAsync({
        html,
      });
    } catch (error) {
      console.error('Error printing receipt:', error);
      Alert.alert('خطأ', 'فشل في طباعة الفاتورة');
    }
  };

  const generateReceiptHTML = (receipt: any) => {
    const currentDate = new Date(receipt.createdAt || Date.now());
    const dateStr = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    const customerName = receipt.customerId?.name || 'عميل غير محدد';

    // Calculate totals
    let subtotal = 0;
    receipt.items?.forEach((item: any) => {
      subtotal += item.quantity * item.price;
    });
    const discountAmount = receipt.discount || 0;
    const total = Math.max(0, subtotal - discountAmount);

    const itemsHTML = receipt.items?.map((item: any) => {
      const itemTotal = item.quantity * item.price;

      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.itemId?.name || 'منتج غير محدد'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.price?.toFixed(2)} دج</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${itemTotal.toFixed(2)} دج</td>
        </tr>
      `;
    }).join('') || '';

    const discountHTML = discountAmount > 0 ? `
      <tr>
        <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">الخصم:</td>
        <td style="padding: 8px; text-align: center; font-weight: bold;">-${discountAmount.toFixed(2)} دج</td>
      </tr>
    ` : '';

    const changeHTML = (receipt.pricePayed || 0) > total ? `
      <tr>
        <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold; color: #28a745;">الباقي:</td>
        <td style="padding: 8px; text-align: center; font-weight: bold; color: #28a745;">${((receipt.pricePayed || 0) - total).toFixed(2)} دج</td>
      </tr>
    ` : '';

    return `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>فاتورة ${receipt.receiptNumber || receipt._id?.slice(-8)}</title>
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
          <div class="store-name">${receipt.storeId?.name || 'المتجر'}</div>
          <div class="store-info">${receipt.storeId?.address || 'العنوان'}</div>
          <div class="store-info">${receipt.storeId?.phone || 'الهاتف'}</div>
        </div>

        <div class="receipt-info">
          <div class="info-row">
            <span class="info-label">رقم الفاتورة:</span>
            <span class="info-value">${receipt.receiptNumber || receipt._id?.slice(-8)}</span>
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
            <span>${(receipt.pricePayed || 0).toFixed(2)} دج</span>
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

  const handleEditReceipt = (receipt: any) => {
    router.push({
      pathname: '/(tabs)/add-receipt',
      params: { receiptId: receipt._id }
    });
  };

  const renderReceipt = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.receiptCard} onPress={() => handleViewReceipt(item)}>
      <View style={styles.receiptHeader}>
        <Text style={styles.receiptId}>فاتورة #{item._id.slice(-8)}</Text>
        <Text style={styles.receiptDate}>
          {formatDate(new Date(item.createdAt || Date.now()))}
        </Text>
      </View>

      <View style={styles.receiptDetails}>
        <Text style={styles.customerName}>
          العميل: {item.customerId?.name || 'غير محدد'}
        </Text>
        <Text style={styles.addedByName}>
          أضيف بواسطة: {item.addedBy ? `${item.addedBy.name} ${item.addedBy.lastname || ''}`.trim() : 'غير محدد'}
        </Text>
        <Text style={styles.totalAmount}>
          المجموع: {(item.total || 0).toLocaleString('en-US')} دج
        </Text>
        {item.discount > 0 && (
          <Text style={styles.discount}>الخصم: {item.discount.toLocaleString('en-US')} دج</Text>
        )}
      </View>

      <View style={styles.receiptActions}>
        {userPermissions?.editingReceipts && (
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditReceipt(item)}
          >
            <Ionicons name="pencil" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>تعديل</Text>
          </TouchableOpacity>
        )}

        {userPermissions?.deletingReceipts && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteReceipt(item._id)}
          >
            <Ionicons name="trash" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>حذف</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>جاري تحميل الفواتير...</Text>
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="business-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>لا يوجد متجر</Text>
        <Text style={styles.emptyMessage}>
          ليس لديك متجر أو لست موظف في أي متجر
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>الفواتير</Text>
        {userPermissions?.editingReceipts && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              router.push('/(tabs)/add-receipt');
            }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {receipts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>لا توجد فواتير بعد</Text>
          <Text style={styles.emptyMessage}>
            أنشئ فاتورتك الأولى للبدء
          </Text>
        </View>
      ) : !userPermissions?.viewingAllReceipts ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>لا توجد صلاحية لعرض الفواتير</Text>
          <Text style={styles.emptyMessage}>
            لا تمتلك صلاحية عرض الفواتير في هذا المتجر
          </Text>
        </View>
      ) : (
        <FlatList
          data={receipts}
          renderItem={renderReceipt}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

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
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.receiptPreviewScroll}>
            <View style={styles.receiptPreview}>
              {/* Store Header */}
              <View style={styles.receiptStoreHeader}>
                <Text style={styles.storeNameModal}>{selectedReceipt?.storeId?.name || 'المتجر'}</Text>
                <Text style={styles.storeAddress}>{selectedReceipt?.storeId?.address || 'العنوان'}</Text>
                <Text style={styles.storePhone}>{selectedReceipt?.storeId?.phone || 'الهاتف'}</Text>
              </View>

              {/* Receipt Info */}
              <View style={styles.receiptInfo}>
                <View style={styles.receiptInfoRow}>
                  <Text style={styles.receiptInfoLabel}>رقم الفاتورة:</Text>
                  <Text style={styles.receiptInfoValue}>{selectedReceipt?.receiptNumber || selectedReceipt?._id.slice(-8)}</Text>
                </View>
                <View style={styles.receiptInfoRow}>
                  <Text style={styles.receiptInfoLabel}>التاريخ:</Text>
                  <Text style={styles.receiptInfoValue}>
                    {selectedReceipt ? formatDate(new Date(selectedReceipt.createdAt || Date.now())) : ''}
                  </Text>
                </View>
                <View style={styles.receiptInfoRow}>
                  <Text style={styles.receiptInfoLabel}>العميل:</Text>
                  <Text style={styles.receiptInfoValue}>
                    {selectedReceipt?.customerId?.name || 'عميل غير محدد'}
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
              {selectedReceipt?.items?.map((item: any, index: number) => {
                const itemTotal = item.quantity * item.price;

                return (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.tableProduct]}>{item.itemId?.name}</Text>
                    <Text style={[styles.tableCell, styles.tableQty]}>{item.quantity}</Text>
                    <Text style={[styles.tableCell, styles.tablePrice]}>{item.price?.toFixed(2)}</Text>
                    <Text style={[styles.tableCell, styles.tableTotal]}>{itemTotal.toFixed(2)}</Text>
                  </View>
                );
              })}

              {/* Totals Section */}
              <View style={styles.receiptTotals}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>المجموع الفرعي:</Text>
                  <Text style={styles.totalValue}>{((selectedReceipt?.total || 0) + (selectedReceipt?.discount || 0)).toFixed(2)} دج</Text>
                </View>
                {parseFloat(selectedReceipt?.discount || '0') > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>الخصم:</Text>
                    <Text style={styles.totalValue}>-{parseFloat(selectedReceipt?.discount || '0').toFixed(2)} دج</Text>
                  </View>
                )}
                <View style={[styles.totalRow, styles.finalTotalRowPreview]}>
                  <Text style={styles.finalTotalLabelPreview}>المجموع النهائي:</Text>
                  <Text style={styles.finalTotalValuePreview}>{(selectedReceipt?.total || 0).toFixed(2)} دج</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>المبلغ المدفوع:</Text>
                  <Text style={styles.totalValue}>{(selectedReceipt?.pricePayed || 0).toFixed(2)} دج</Text>
                </View>
                {parseFloat(selectedReceipt?.pricePayed || '0') > (selectedReceipt?.total || 0) && (
                  <View style={[styles.totalRow, styles.changeRowPreview]}>
                    <Text style={styles.changeLabelPreview}>الباقي:</Text>
                    <Text style={styles.changeValuePreview}>{(parseFloat(selectedReceipt?.pricePayed || '0') - (selectedReceipt?.total || 0)).toFixed(2)} دج</Text>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={styles.receiptPreviewFooter}>
                <Text style={styles.receiptPreviewFooterText}>شكراً لزيارتكم</Text>
                <Text style={styles.receiptPreviewFooterSubtext}>نتمنى أن نراكم مرة أخرى</Text>
              </View>
            </View>
          </ScrollView>

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
              onPress={() => setShowReceiptModal(false)}
            >
              <Ionicons name="close-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonModalText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#28a745',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100, // Extra padding for floating button
  },
  receiptCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  receiptHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  receiptDate: {
    fontSize: 14,
    color: '#666',
  },
  receiptDetails: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  addedByName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 4,
  },
  discount: {
    fontSize: 14,
    color: '#ff6b35',
  },
  receiptActions: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  storeNameModal: {
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
});