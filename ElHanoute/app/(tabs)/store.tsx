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
  KeyboardAvoidingView,
  Platform,
  Modal,
  Switch,
  FlatList,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/api';
import { useRouter } from 'expo-router';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
interface Store {
  _id: string;
  name: string;
  wilaya: string;
  city: string;
  registre: string;
  address: string;
  email: string;
  phone: string;
  location: {
    x: number;
    y: number;
  };
  ownerId: {
    _id: string;
    name: string;
    lastname: string;
    email: string;
  };
  workers: Array<{
    userId: {
      _id: string;
      name: string;
      lastname: string;
      email: string;
    };
    position: string;
  }>;
}

interface Role {
  _id: string;
  name: string;
  storeId: string;
  dateOfAdding: string;
  users: string[];
  createdBy: string;
  permissions: {
    viewingFullInventory: boolean;
    addingItems: boolean;
    editingItems: boolean;
    deletingItems: boolean;
    addingCustomers: boolean;
    deletingCustomers: boolean;
    editingCustomer: boolean;
    assigningUsersFromStore: boolean;
    deletingUsersFromStore: boolean;
    viewingAllReceipts: boolean;
    deletingReceipts: boolean;
    editingReceipts: boolean;
  };
}

export default function StoreScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedStore, setEditedStore] = useState<Partial<Store>>({});
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  // Role management state
  const [roles, setRoles] = useState<Role[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  // User role and permissions
  const [userRole, setUserRole] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<any>(null);

  // Receipts state
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);

  useEffect(() => {
    fetchUserStore();
  }, [user]);

  useEffect(() => {
    if (store) {
      fetchReceipts();
      fetchUserRole();
    }
  }, [store]);

  const fetchUserStore = async () => {
    if (!user) {
      console.log('No user found, setting loading to false');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching all stores to check user access...');
      const response = await api.get('/stores');
      const stores: Store[] = response.data;
      console.log('All stores:', stores.map(s => ({ id: s._id, owner: s.ownerId._id, workers: s.workers.map(w => w.userId) })));
      
      // First check if user is owner of any store
      const ownedStore = stores.find(store => store.ownerId._id === user._id);
      if (ownedStore) {
        console.log('User is owner of store:', ownedStore._id);
        setStore(ownedStore);
        setEditedStore(ownedStore);
        setUserRole('owner');
        console.log('Owner store loaded successfully');
        return;
      }
      
      // Check if user is in workers array of any store
      const workerStore = stores.find(store => 
        store.workers.some(worker => 
          (typeof worker.userId === 'object' ? worker.userId._id : worker.userId) === user._id
        )
      );
      
      if (workerStore) {
        console.log('User is worker in store:', workerStore._id);
        setStore(workerStore);
        setEditedStore(workerStore);
        // Find the worker's position/role
        const workerInfo = workerStore.workers.find(worker => 
          (typeof worker.userId === 'object' ? worker.userId._id : worker.userId) === user._id
        );
        setUserRole(workerInfo?.position || 'employee');
        console.log('Worker store loaded successfully, role:', workerInfo?.position);
        return;
      }
      
      // Check legacy user.stores array (for backward compatibility)
      if ((user as any).stores && (user as any).stores.length > 0) {
        console.log('User has stores array (legacy):', (user as any).stores);
        const storeId = (user as any).stores[0].store;
        const legacyStore = stores.find(s => s._id === storeId);
        if (legacyStore) {
          setStore(legacyStore);
          setEditedStore(legacyStore);
          setUserRole((user as any).stores[0].role);
          console.log('Legacy store loaded successfully');
          return;
        }
      }
      
      console.log('User is neither owner nor worker in any store - no store access');
      setStore(null);
    } catch (error) {
      console.error('Error fetching stores:', error);
      Alert.alert('خطأ', 'فشل في تحميل معلومات المتجر');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedStore({ ...store });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedStore({ ...store });
  };

  const handleSave = async () => {
    if (!store) return;

    // Validation
    if (!editedStore.name?.trim()) {
      Alert.alert('خطأ', 'اسم المتجر مطلوب');
      return;
    }
    if (!editedStore.wilaya?.trim()) {
      Alert.alert('خطأ', 'الولاية مطلوبة');
      return;
    }
    if (!editedStore.city?.trim()) {
      Alert.alert('خطأ', 'المدينة مطلوبة');
      return;
    }
    if (!editedStore.address?.trim()) {
      Alert.alert('خطأ', 'العنوان مطلوب');
      return;
    }

    try {
      setIsSaving(true);

      // Ensure location has valid coordinates, use existing location if available
      const locationData = editedStore.location && typeof editedStore.location.x === 'number' && typeof editedStore.location.y === 'number'
        ? editedStore.location
        : (store.location || { x: 0, y: 0 });

      const updateData = {
        name: editedStore.name,
        wilaya: editedStore.wilaya,
        city: editedStore.city,
        registre: editedStore.registre,
        address: editedStore.address,
        email: editedStore.email,
        phone: editedStore.phone,
        location: locationData,
        ownerId: store.ownerId._id, // Required by backend
      };

      const response = await api.put(`/stores/${store._id}`, updateData);
      
      // Refetch the store data to ensure populated owner/workers
      await fetchUserStore();
      
      setIsEditing(false);
      Alert.alert('نجح', 'تم تحديث معلومات المتجر بنجاح');
    } catch (error: any) {
      console.error('Error updating store:', error);
      Alert.alert('خطأ', error.response?.data?.error || error.response?.data?.message || 'فشل في تحديث معلومات المتجر');
    } finally {
      setIsSaving(false);
    }
  };

  const updateEditedStore = (field: keyof Store, value: any) => {
    setEditedStore(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const captureCurrentLocation = async () => {
    try {
      setIsCapturingLocation(true);

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'تم رفض الإذن',
          'إذن الموقع مطلوب لالتقاط الموقع الحالي.'
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Update the edited store with new coordinates
      setEditedStore(prev => ({
        ...prev,
        location: {
          x: latitude,
          y: longitude,
        }
      }));

      Alert.alert(
        'تم التقاط الموقع',
        `خط العرض: ${latitude.toFixed(6)}\nخط الطول: ${longitude.toFixed(6)}`
      );

    } catch (error) {
      console.error('Error capturing location:', error);
      Alert.alert('خطأ', 'فشل في التقاط الموقع الحالي. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsCapturingLocation(false);
    }
  };

  // Role management functions
  const fetchReceipts = async () => {
    if (!store) return;

    try {
      setLoadingReceipts(true);
      const res = await api.get('/receipts');
      const allReceipts: any[] = res.data || [];
      const storeReceipts = allReceipts.filter(r => r.storeId === store._id);
      storeReceipts.sort((a, b) => new Date(b.createdAt || b.dateOfAdding || 0).getTime() - new Date(a.createdAt || a.dateOfAdding || 0).getTime());
      setReceipts(storeReceipts);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoadingReceipts(false);
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
          viewingFullInventory: true,
          addingItems: true,
          editingItems: true,
          deletingItems: true,
          addingCustomers: true,
          deletingCustomers: true,
          editingCustomer: true,
          assigningUsersFromStore: true,
          deletingUsersFromStore: true,
          viewingAllReceipts: true,
          deletingReceipts: true,
          editingReceipts: true,
        });
      }
    } catch (error) {
      console.error('Error fetching role:', error);
    }
  };

  const fetchRoles = async () => {
    if (!store) return;

    try {
      const response = await api.get(`/roles?storeId=${store._id}`);
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const createBasicRole = async () => {
    if (!store || !user) return;

    try {
      setIsCreatingRole(true);

      // Create a basic role with minimal permissions
      const basicRole = {
        name: 'الدور الأساسي',
        storeId: store._id,
        createdBy: user._id,
        permissions: {
          viewingFullInventory: false,
          addingItems: false,
          editingItems: false,
          deletingItems: false,
          addingCustomers: false,
          deletingCustomers: false,
          editingCustomer: false,
          assigningUsersFromStore: false,
          deletingUsersFromStore: false,
          viewingAllReceipts: false,
          deletingReceipts: false,
          editingReceipts: false,
        }
      };

      const response = await api.post('/roles', basicRole);
      const newRole = response.data;

      // Assign all current workers to this role
      const allUserIds = [
        store.ownerId._id,
        ...store.workers.map(worker => 
          typeof worker.userId === 'object' ? worker.userId._id : worker.userId
        )
      ];

      for (const userId of allUserIds) {
        try {
          await api.post(`/roles/${newRole._id}/users`, { userId });
        } catch (error) {
          console.error(`Error adding user ${userId} to role:`, error);
        }
      }

      await fetchRoles();
      Alert.alert('نجح', 'تم إنشاء الدور الأساسي وتعيين جميع المستخدمين إليه');
    } catch (error: any) {
      console.error('Error creating basic role:', error);
      Alert.alert('خطأ', error.response?.data?.error || 'فشل في إنشاء الدور الأساسي');
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleRolePress = () => {
    if (roles.length === 0) {
      // No roles exist, create basic role
      createBasicRole();
    } else {
      // Show role selection modal
      setShowRoleModal(true);
    }
  };

  const updateRolePermissions = async (roleId: string, permissions: any) => {
    try {
      await api.put(`/roles/${roleId}`, { permissions });
      await fetchRoles();
      Alert.alert('نجح', 'تم تحديث صلاحيات الدور');
    } catch (error: any) {
      console.error('Error updating role permissions:', error);
      Alert.alert('خطأ', error.response?.data?.error || 'فشل في تحديث صلاحيات الدور');
    }
  };

  // Fetch roles when store is loaded
  useEffect(() => {
    if (store) {
      fetchRoles();
    }
  }, [store]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noStoreTitle}>😢 لم يتم العثور على متجر</Text>
        <Text style={styles.noStoreMessage}>
          ليس لديك متجر يا صديقي
        </Text>
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
          {isEditing ? (
            <TextInput
              style={styles.titleInput}
              value={editedStore.name || ''}
              onChangeText={(value) => updateEditedStore('name', value)}
              placeholder="Store Name"
              maxLength={100}
            />
          ) : (
            <Text style={styles.title}>{store.name}</Text>
          )}
          <Text style={styles.subtitle}>معلومات المتجر</Text>

          {!isEditing && (userRole === 'owner' || userRole === 'manager') ? (
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <Text style={styles.editButtonText}>تعديل المتجر</Text>
            </TouchableOpacity>
          ) : null}

          {isEditing ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>حفظ</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المعلومات الأساسية</Text>

            <View style={styles.inputRow}>
              <Text style={styles.label}>الاسم:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedStore.name || ''}
                  onChangeText={(value) => updateEditedStore('name', value)}
                  placeholder="Store Name"
                  maxLength={100}
                />
              ) : (
                <Text style={styles.value}>{store.name}</Text>
              )}
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.label}>الولاية:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedStore.wilaya || ''}
                  onChangeText={(value) => updateEditedStore('wilaya', value)}
                  placeholder="الولاية"
                  maxLength={50}
                />
              ) : (
                <Text style={styles.value}>{store.wilaya}</Text>
              )}
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.label}>المدينة:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedStore.city || ''}
                  onChangeText={(value) => updateEditedStore('city', value)}
                  placeholder="المدينة"
                  maxLength={50}
                />
              ) : (
                <Text style={styles.value}>{store.city}</Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>معلومات الاتصال</Text>

            <View style={styles.inputRow}>
              <Text style={styles.label}>البريد الإلكتروني:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedStore.email || ''}
                  onChangeText={(value) => updateEditedStore('email', value)}
                  placeholder="store@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={100}
                />
              ) : (
                <Text style={styles.value}>{store.email}</Text>
              )}
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.label}>الهاتف:</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedStore.phone || ''}
                  onChangeText={(value) => updateEditedStore('phone', value)}
                  placeholder="+213 XX XX XX XX"
                  keyboardType="phone-pad"
                  maxLength={20}
                />
              ) : (
                <Text style={styles.value}>{store.phone}</Text>
              )}
            </View>
          </View>

          {/* Management Buttons Row */}
          {(userRole === 'owner' || userRole === 'manager') && (
            <View style={styles.managementButtonsRow}>
              <TouchableOpacity
                style={styles.managementButton}
                onPress={() => router.push('/(tabs)/roles')}
                activeOpacity={0.8}
              >
                <View style={styles.buttonGradient}>
                  <View style={styles.buttonGradientBase} />
                  <View style={styles.buttonGradientMiddle} />
                  <View style={styles.buttonGradientTop} />
                  <View style={styles.buttonContent}>
                    <FontAwesome name="vcard-o" size={32} color="#fff" />
                    <Text style={styles.managementButtonText}>الأدوار</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.managementButton}
                onPress={() => router.push('/(tabs)/users')}
                activeOpacity={0.8}
              >
                <View style={styles.buttonGradient}>
                  <View style={styles.buttonGradientBase} />
                  <View style={styles.buttonGradientMiddle} />
                  <View style={styles.buttonGradientTop} />
                  <View style={styles.buttonContent}>
                    <FontAwesome6 name="building-user" size={32} color="#fff" />
                    <Text style={styles.managementButtonText}>العمال</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.managementButton}
                onPress={() => router.push('/(tabs)/customers')}
                activeOpacity={0.8}
              >
                <View style={styles.buttonGradient}>
                  <View style={styles.buttonGradientBase} />
                  <View style={styles.buttonGradientMiddle} />
                  <View style={styles.buttonGradientTop} />
                  <View style={styles.buttonContent}>
                    <FontAwesome5 name="user-friends" size={32} color="#fff" />
                    <Text style={styles.managementButtonText}>الزبائن</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Expandable Additional Details */}
          <TouchableOpacity
            style={styles.expandableSection}
            onPress={() => setShowAdditionalDetails(!showAdditionalDetails)}
            activeOpacity={0.7}
          >
            <View style={styles.expandableHeader}>
              <Text style={styles.expandableTitle}>
                {showAdditionalDetails ? 'إخفاء التفاصيل الإضافية' : 'عرض التفاصيل الإضافية'}
              </Text>
              <Text style={styles.expandableIcon}>
                {showAdditionalDetails ? '▲' : '▼'}
              </Text>
            </View>
            <View style={styles.fadedLine} />
          </TouchableOpacity>

          {showAdditionalDetails && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>تفاصيل إضافية</Text>

                <View style={styles.inputRow}>
                  <Text style={styles.label}>العنوان الكامل:</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={editedStore.address || ''}
                      onChangeText={(value) => updateEditedStore('address', value)}
                      placeholder="العنوان الكامل"
                      multiline
                      maxLength={200}
                    />
                  ) : (
                    <Text style={styles.value}>{store.address}</Text>
                  )}
                </View>

                <View style={styles.inputRow}>
                  <Text style={styles.label}>التسجيل:</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.input}
                      value={editedStore.registre || ''}
                      onChangeText={(value) => updateEditedStore('registre', value)}
                      placeholder="Registration Number"
                      maxLength={50}
                    />
                  ) : (
                    <Text style={styles.value}>{store.registre}</Text>
                  )}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>المالك</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>الاسم:</Text>
                  <Text style={styles.value}>
                    {store.ownerId && typeof store.ownerId === 'object' && store.ownerId.name
                      ? `${store.ownerId.name} ${store.ownerId.lastname}`
                      : 'بيانات المالك غير متوفرة'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>البريد الإلكتروني:</Text>
                  <Text style={styles.value}>
                    {store.ownerId && typeof store.ownerId === 'object' && store.ownerId.email
                      ? store.ownerId.email
                      : 'بيانات المالك غير متوفرة'}
                  </Text>
                </View>
              </View>

              {store.location && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>إحداثيات الموقع</Text>
                    {isEditing && (
                      <TouchableOpacity
                        style={[styles.captureLocationButton, isCapturingLocation && styles.captureLocationButtonDisabled]}
                        onPress={captureCurrentLocation}
                        disabled={isCapturingLocation}
                      >
                        {isCapturingLocation ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.captureLocationText}>📍 التقاط الموقع الحالي</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.inputRow}>
                    <Text style={styles.label}>خط العرض:</Text>
                    {isEditing ? (
                      <TextInput
                        style={[styles.input, styles.readOnlyInput]}
                        value={editedStore.location?.x?.toString() ?? ''}
                        placeholder="اضغط 'التقاط الموقع الحالي' أعلاه"
                        editable={false}
                        selectTextOnFocus={false}
                      />
                    ) : (
                      <Text style={styles.value}>{store.location.x.toLocaleString('en-US', { maximumFractionDigits: 6 })}</Text>
                    )}
                  </View>

                  <View style={styles.inputRow}>
                    <Text style={styles.label}>خط الطول:</Text>
                    {isEditing ? (
                      <TextInput
                        style={[styles.input, styles.readOnlyInput]}
                        value={editedStore.location?.y?.toString() ?? ''}
                        placeholder="Tap 'Capture Current Location' above"
                        editable={false}
                        selectTextOnFocus={false}
                      />
                    ) : (
                      <Text style={styles.value}>{store.location.y.toLocaleString('en-US', { maximumFractionDigits: 6 })}</Text>
                    )}
                  </View>
                </View>
              )}
            </>
          )}

          {/* Receipts Section */}
          {userPermissions?.viewingAllReceipts && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>الفواتير</Text>
              {loadingReceipts ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : receipts.length === 0 ? (
                <Text style={styles.noReceiptsText}>لا توجد فواتير</Text>
              ) : (
                <FlatList
                  data={receipts.slice(0, 10)}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    <View style={styles.receiptRow}>
                      <View>
                        <Text style={styles.receiptRowId}>#{item.receiptNumber || item._id.slice(-8)}</Text>
                        <Text style={styles.receiptRowCustomer}>{item.customerId?.name || 'زبون غير محدد'}</Text>
                      </View>
                      <Text style={styles.receiptRowTotal}>{item.total || item.pricePayed || 0} دج</Text>
                    </View>
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                />
              )}
              <TouchableOpacity onPress={() => router.push('/(tabs)/receipts')} style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>عرض جميع الفواتير</Text>
              </TouchableOpacity>
            </View>
          )}
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
    paddingHorizontal: 24,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  captureLocationButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  captureLocationButtonDisabled: {
    backgroundColor: '#ccc',
  },
  captureLocationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    flex: 1,
    textAlign: 'left',
  },
  value: {
    fontSize: 16,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  input: {
    flex: 2,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  readOnlyInput: {
    backgroundColor: '#f0f0f0',
    color: '#666',
    borderColor: '#ccc',
  },
  noStoreTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  noStoreMessage: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  closeModalButton: {
    padding: 5,
  },
  closeModalText: {
    fontSize: 24,
    color: '#666',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'NotoSansArabic-Bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  roleCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  roleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'NotoSansArabic-Bold',
    marginBottom: 5,
  },
  roleUsersCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontFamily: 'NotoSansArabic-Regular',
  },
  permissionsSection: {
    marginTop: 10,
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    fontFamily: 'NotoSansArabic-Bold',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  permissionLabel: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'NotoSansArabic-Regular',
    flex: 1,
    marginRight: 10,
  },
  managementButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  managementButton: {
    flex: 1,
    borderRadius: 12,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    position: 'relative',
    borderRadius: 12,
  },
  buttonGradientBase: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#667eea',
    borderRadius: 12,
  },
  buttonGradientMiddle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '30%',
    backgroundColor: 'rgba(102, 126, 234, 0.8)',
    borderRadius: 12,
  },
  buttonGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '60%',
    backgroundColor: 'rgba(0, 212, 255, 0.4)',
    borderRadius: 12,
  },
  buttonContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  managementButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'NotoSansArabic-Bold',
    textAlign: 'center',
  },
  expandableSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
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
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  expandableTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    fontFamily: 'NotoSansArabic-Bold',
  },
  expandableIcon: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  fadedLine: {
    height: 1,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    marginHorizontal: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  receiptRowId: {
    fontSize: 14,
    color: '#333',
    fontWeight: '700',
  },
  receiptRowCustomer: {
    fontSize: 12,
    color: '#666',
  },
  receiptRowTotal: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '700',
  },
  viewAllButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  noReceiptsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});