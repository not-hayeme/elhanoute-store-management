import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  FlatList,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/api';
import SwipeableCard, { SwipeAction } from '../../components/SwipeableCard';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Camera, CameraView } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
interface Item {
  _id: string;
  name: string;
  reference: string;
  price: number;
  unitsPerBox?: number;
  promo?: string;
  image?: string;
  dateOfAdding: string;
  addedBy: {
    _id: string;
    name: string;
    lastname: string;
  };
  storeId: string;
}

interface Store {
  _id: string;
  name: string;
  ownerId: {
    _id: string;
  };
  workers?: Array<{
    userId: {
      _id: string;
      name: string;
      lastname: string;
      email: string;
    };
    position: string;
  }>;
}

interface ItemCardProps {
  item: Item;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ItemsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // User role and permissions state
  const [userRole, setUserRole] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<any>(null);

  // Filter items based on search query
  const filteredItems = items.filter(item =>
    (item.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (item.reference?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (item.promo && item.promo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    fetchStoreAndItems();
  }, [user]);

  // Request camera permissions
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Refresh data when screen comes back into focus (e.g., after adding an item)
  useFocusEffect(
    React.useCallback(() => {
      fetchStoreAndItems();
    }, [user])
  );

  const fetchStoreAndItems = async () => {
    if (!user) {
      setIsLoading(false);
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
        const storesResponse = await api.get('/stores');
        const stores: Store[] = storesResponse.data;
        console.log('All stores:', stores.map(s => ({ id: s._id, owner: s.ownerId._id, workers: s.workers?.map((w: any) => w.userId) })));
        
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
            store.workers?.some((worker: any) => 
              (typeof worker.userId === 'object' ? worker.userId._id : worker.userId) === user._id
            )
          );
          
          if (workerStore) {
            console.log('User is worker in store:', workerStore._id);
            userStore = workerStore;
            // Find the worker's position/role
            const workerInfo = workerStore.workers?.find((worker: any) => 
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
        await fetchUserRole(userStore);
        await fetchItemsForStore(userStore._id);
      } else {
        console.log('User is neither owner nor worker in any store - no store access');
        setStore(null);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      Alert.alert('خطأ', 'فشل في تحميل معلومات المتجر');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRole = async (userStore: Store) => {
    if (!user) return;

    try {
      const response = await api.get(`/roles?storeId=${userStore._id}`);
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
        });
      }
    } catch (error) {
      console.error('Error fetching role:', error);
    }
  };

  const fetchItemsForStore = async (storeId: string) => {
    try {
      const itemsResponse = await api.get(`/items?storeId=${storeId}`);
      setItems(itemsResponse.data);
    } catch (error) {
      console.error('Error fetching items:', error);
      Alert.alert('خطأ', 'فشل في تحميل المنتجات');
    }
  };

  const deleteItem = async (itemId: string, itemName: string) => {
    Alert.alert(
      'حذف المنتج',
      `هل أنت متأكد من حذف "${itemName}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/items/${itemId}`);
              setItems(prev => prev.filter(item => item._id !== itemId));
              Alert.alert('نجح', 'تم حذف المنتج بنجاح');
            } catch (error: any) {
              console.error('Error deleting item:', error);
              Alert.alert('خطأ', error.response?.data?.error || 'فشل في حذف المنتج');
            }
          }
        }
      ]
    );
  };

  const editItem = (item: Item) => {
    // Navigate to add-item screen with item data for editing
    router.push({
      pathname: '/(tabs)/add-item',
      params: {
        mode: 'edit',
        itemId: item._id,
        itemData: JSON.stringify({
          name: item.name,
          reference: item.reference,
          price: item.price.toString(),
          unitsPerBox: item.unitsPerBox?.toString() || '',
          promo: item.promo || '',
        })
      }
    });
  };

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItemId(expandedItemId === itemId ? null : itemId);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setIsScanning(false);
    setSearchQuery(data); // Set the scanned barcode as search query
  };

  const startScanning = () => {
    if (hasPermission === null) {
      Alert.alert('Camera permission not determined');
      return;
    }
    if (hasPermission === false) {
      Alert.alert('Camera permission denied', 'Please enable camera permission in settings');
      return;
    }
    setIsScanning(true);
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  const renderItem = ({ item }: { item: Item }) => {
    const isExpanded = expandedItemId === item._id;

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const actions: SwipeAction[] = [
      ...(userPermissions?.editingItems ? [{
        key: 'edit',
        icon: <FontAwesome6 name="edit" size={20} color="#0056CC" />,
        backgroundColor: '#e3f2fd',
        onPress: () => editItem(item),
      }] : []),
      ...(userPermissions?.deletingItems ? [{
        key: 'delete',
        icon: <Feather name="trash" size={20} color="#B22222" />,
        backgroundColor: '#ffebee',
        onPress: () => deleteItem(item._id, item.name),
      }] : []),
    ];

    return (
      <SwipeableCard actions={actions}>
        <TouchableOpacity
          style={[
            styles.itemCard,
            isExpanded && styles.itemCardExpanded,
          ]}
          onPress={() => toggleItemExpansion(item._id)}
          activeOpacity={0.7}
        >
          {/* Compact View - Always visible */}
          <View style={styles.itemCompact}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>{item.price.toFixed(2)} DA</Text>
            <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
          </View>

          {/* Expanded View - Only visible when expanded */}
          {isExpanded && (
            <View style={styles.itemExpanded}>
              <View style={styles.itemDetails}>
                <Text style={styles.itemReference}>المرجع: {item.reference}</Text>
                {item.unitsPerBox && (
                  <Text style={styles.itemUnits}>الوحدات لكل صندوق: {item.unitsPerBox}</Text>
                )}
                {item.promo && (
                  <Text style={styles.itemPromo}>العرض: {item.promo}</Text>
                )}
                <Text style={styles.itemDate}>
                  أضيف في: {formatDate(item.dateOfAdding)}
                </Text>
              </View>
              <View style={styles.actionButtons}>
                {userPermissions?.editingItems && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => editItem(item)}
                  >
                    <Text style={styles.editButtonText}>تعديل</Text>
                  </TouchableOpacity>
                )}
                {userPermissions?.deletingItems && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteItem(item._id, item.name)}
                  >
                    <Text style={styles.deleteButtonText}>حذف</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>
      </SwipeableCard>
    );
  };

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
        <Text style={styles.noStoreTitle}>لم يتم العثور على متجر</Text>
        <Text style={styles.noStoreMessage}>
          تحتاج إلى متجر لإدارة المنتجات
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>منتجات المتجر</Text>
        <Text style={styles.subtitle}>{store.name}</Text>
      </View>

      <View style={styles.content}>
        {!userPermissions?.viewingFullInventory ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>لا توجد صلاحية لعرض المنتجات</Text>
            <Text style={styles.emptyMessage}>
              لا تمتلك صلاحية عرض المنتجات في هذا المتجر
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>لا توجد منتجات بعد</Text>
            <Text style={styles.emptyMessage}>
              ابدأ بإضافة منتجك الأول للمتجر
            </Text>
          </View>
        ) : (
          <>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="البحث في المنتجات بالاسم أو المرجع أو العرض..."
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
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={startScanning}
              >
                <Ionicons name="barcode-outline" size={24} color="black" />
              </TouchableOpacity>
            </View>

            {/* Results Count */}
            {searchQuery.length > 0 && (
              <Text style={styles.resultsCount}>
                {filteredItems.length.toLocaleString('en-US')} من {items.length.toLocaleString('en-US')} منتج
              </Text>
            )}

            <FlatList
              data={filteredItems}
              renderItem={renderItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.itemsList}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </View>

      {/* Floating Action Button */}
      {userPermissions?.addingItems && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(tabs)/add-item')}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Camera Scanning Modal */}
      <Modal
        visible={isScanning}
        onRequestClose={stopScanning}
        animationType="slide"
      >
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <Text style={styles.cameraTitle}>مسح الباركود</Text>
              <TouchableOpacity
                style={styles.closeCameraButton}
                onPress={stopScanning}
              >
                <Text style={styles.closeCameraText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.scanFrame}>
              <View style={styles.scanCorner} />
              <View style={[styles.scanCorner, styles.topRight]} />
              <View style={[styles.scanCorner, styles.bottomLeft]} />
              <View style={[styles.scanCorner, styles.bottomRight]} />
            </View>
            <Text style={styles.scanInstructions}>
              ضع الباركود داخل الإطار
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: 80, // Account for absolutely positioned tab bar
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
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
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
  cameraButton: {
    marginLeft: 12,
    padding: 4,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  itemsList: {
    paddingBottom: 20,
  },

  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContent: {
    width: '100%',
  },
  itemCardExpanded: {
    backgroundColor: '#f8f9fa',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  itemCompact: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28a745',
    marginRight: 12,
  },
  expandIcon: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  itemExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  itemDetails: {
    marginBottom: 12,
  },
  itemReference: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemUnits: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  itemPromo: {
    fontSize: 14,
    color: '#ff6b35',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
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
    justifyContent: 'space-between',
    padding: 20,
  },
  cameraHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 8,
  },
  cameraTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeCameraButton: {
    padding: 8,
  },
  closeCameraText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
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
    borderRightWidth: 3,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    top: '70%',
    left: '20%',
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    top: '70%',
    right: '20%',
    left: undefined,
    borderTopWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderLeftWidth: 0,
  },
  scanInstructions: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 8,
  },
});