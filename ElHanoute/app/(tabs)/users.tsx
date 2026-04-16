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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/api';
import SwipeableCard, { SwipeAction } from '../../components/SwipeableCard';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

interface Worker {
  _id: string;
  userId: {
    _id: string;
    name: string;
    lastname: string;
    email: string;
  };
  position: string;
  roleId?: string;
}

interface Invitation {
  _id: string;
  phone: string;
  status: string;
  invitedBy: {
    _id: string;
    name: string;
    lastname: string;
  };
  createdAt: string;
  expiresAt: string;
}

interface Role {
  _id: string;
  name: string;
  users: string[];
}

export default function UsersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editingPosition, setEditingPosition] = useState('');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch store data to get workers
      const storeResponse = await api.get('/stores');
      const stores = storeResponse.data;
      const userStore = stores.find((store: any) => store.ownerId._id === user._id);

      if (userStore && userStore.workers) {
        setWorkers(userStore.workers);
      }

      // Fetch roles for role information
      const rolesResponse = await api.get('/roles?storeId=' + (userStore?._id || ''));
      setRoles(rolesResponse.data);

      // Fetch invitations for this store
      const invitationsResponse = await api.get('/invitations/store/' + userStore._id);
      setInvitations(invitationsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const deleteWorker = async (userId: string) => {
    if (!user) return;

    Alert.alert(
      'حذف العامل',
      'هل أنت متأكد من إزالة هذا العامل من المتجر؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              // First find the store
              const storeResponse = await api.get('/stores');
              const stores = storeResponse.data;
              const userStore = stores.find((store: any) => store.ownerId._id === user._id);

              if (!userStore) {
                Alert.alert('خطأ', 'لم يتم العثور على المتجر');
                return;
              }

              await api.delete(`/stores/${userStore._id}/workers/${userId}`);
              await fetchData(); // Refresh data
              Alert.alert('نجح', 'تم إزالة العامل بنجاح');
            } catch (error: any) {
              console.error('Error deleting worker:', error);
              Alert.alert('خطأ', error.response?.data?.error || 'فشل في إزالة العامل');
            }
          }
        }
      ]
    );
  };

  const startEditingWorkerPosition = (workerId: string, currentPosition: string) => {
    setEditingWorkerId(workerId);
    setEditingPosition(currentPosition);
  };

  const cancelEditingWorkerPosition = () => {
    setEditingWorkerId(null);
    setEditingPosition('');
  };

  const saveWorkerPosition = async (workerId: string) => {
    if (!user || !editingPosition.trim()) {
      Alert.alert('خطأ', 'لا يمكن أن تكون الوظيفة فارغة');
      return;
    }

    try {
      // First find the store
      const storeResponse = await api.get('/stores');
      const stores = storeResponse.data;
      const userStore = stores.find((store: any) => store.ownerId._id === user._id);

      if (!userStore) {
        Alert.alert('خطأ', 'لم يتم العثور على المتجر');
        return;
      }

      await api.put(`/stores/${userStore._id}/workers/${workerId}`, {
        position: editingPosition.trim()
      });

      await fetchData(); // Refresh data
      setEditingWorkerId(null);
      setEditingPosition('');
      Alert.alert('نجح', 'تم تحديث وظيفة العامل بنجاح');
    } catch (error: any) {
      console.error('Error updating worker position:', error);
      Alert.alert('خطأ', error.response?.data?.error || 'فشل في تحديث وظيفة العامل');
    }
  };

  const deleteInvitation = async (invitationId: string) => {
    Alert.alert(
      'حذف الدعوة',
      'هل أنت متأكد من حذف هذه الدعوة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/invitations/${invitationId}`);
              await fetchData(); // Refresh data
              Alert.alert('نجح', 'تم حذف الدعوة بنجاح');
            } catch (error: any) {
              console.error('Error deleting invitation:', error);
              Alert.alert('خطأ', error.response?.data?.error || 'فشل في حذف الدعوة');
            }
          }
        }
      ]
    );
  };

  const getRoleName = (worker: Worker) => {
    if (worker.roleId) {
      const role = roles.find(r => r._id === worker.roleId);
      return role ? role.name : 'عامل';
    }
    return 'عامل';
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>قائمة المستخدمين</Text>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => router.push('/invite-user')}
          >
            <Text style={styles.inviteButtonText}>دعوة مستخدم جديد</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Workers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>العاملون ({workers.length.toLocaleString('en-US')})</Text>
          </View>

          {workers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>لا يوجد عمال في المتجر</Text>
            </View>
          ) : (
            workers.map((worker) => {
              const workerId = typeof worker.userId === 'object' ? worker.userId._id : worker.userId;
              const isEditingThisWorker = editingWorkerId === workerId;

              const actions: SwipeAction[] = [
                {
                  key: 'edit',
                  icon: <FontAwesome6 name="edit" size={20} color="#0056CC" />,
                  backgroundColor: '#e3f2fd',
                  onPress: () => startEditingWorkerPosition(workerId, worker.position),
                },
                {
                  key: 'delete',
                  icon: <Feather name="trash" size={20} color="#B22222" />,
                  backgroundColor: '#ffebee',
                  onPress: () => deleteWorker(workerId),
                },
              ];

              return (
                <SwipeableCard key={worker._id} actions={actions}>
                  <View style={styles.workerCard}>
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerName}>
                        {worker.userId && typeof worker.userId === 'object' && worker.userId.name
                          ? `${worker.userId.name} ${worker.userId.lastname || ''}`.trim()
                          : worker.userId && typeof worker.userId === 'object' && worker.userId._id
                          ? `معرف المستخدم: ${worker.userId._id.substring(0, 8)}...`
                          : 'بيانات المستخدم غير متوفرة'}
                      </Text>
                      <Text style={styles.workerPosition}>
                        الوظيفة: {worker.position || 'غير محدد'}
                      </Text>
                      <Text style={styles.workerRole}>
                        الدور: {getRoleName(worker)}
                      </Text>
                      <Text style={styles.workerEmail}>
                        {worker.userId && typeof worker.userId === 'object' && worker.userId.email
                          ? worker.userId.email
                          : 'البريد الإلكتروني غير متوفر'}
                      </Text>

                      {isEditingThisWorker && (
                        <View style={styles.positionEditContainer}>
                          <TextInput
                            style={styles.positionInput}
                            value={editingPosition}
                            onChangeText={setEditingPosition}
                            placeholder="أدخل الوظيفة الجديدة"
                            maxLength={50}
                            autoFocus
                          />
                          <View style={styles.positionEditButtons}>
                            <TouchableOpacity
                              style={[styles.positionButton, styles.savePositionButton]}
                              onPress={() => saveWorkerPosition(workerId)}
                            >
                              <Text style={styles.savePositionText}>حفظ</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.positionButton, styles.cancelPositionButton]}
                              onPress={cancelEditingWorkerPosition}
                            >
                              <Text style={styles.cancelPositionText}>إلغاء</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </SwipeableCard>
              );
            })
          )}
        </View>

        {/* Invitations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>الدعوات ({invitations.length.toLocaleString('en-US')})</Text>
          </View>

          {invitations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>لا توجد دعوات</Text>
            </View>
          ) : (
            invitations.map((invitation) => {
              const actions: SwipeAction[] = [
                {
                  key: 'delete',
                  icon: <Feather name="trash" size={20} color="#B22222" />,
                  backgroundColor: '#ffebee',
                  onPress: () => deleteInvitation(invitation._id),
                },
              ];

              return (
                <SwipeableCard key={invitation._id} actions={actions}>
                  <View style={styles.invitationCard}>
                    <View style={styles.invitationInfo}>
                      <Text style={styles.invitationPhone}>
                        رقم الهاتف: {invitation.phone}
                      </Text>
                      <Text style={styles.invitationStatus}>
                        الحالة: {invitation.status === 'pending' ? 'معلق' :
                                invitation.status === 'accepted' ? 'مقبول' :
                                invitation.status === 'declined' ? 'مرفوض' : 'منتهي الصلاحية'}
                      </Text>
                      <Text style={styles.invitationDate}>
                        تاريخ الدعوة: {new Date(invitation.createdAt).toLocaleDateString('ar-DZ')}
                      </Text>
                      <Text style={styles.invitationExpiry}>
                        تنتهي في: {new Date(invitation.expiresAt).toLocaleDateString('ar-DZ')}
                      </Text>
                    </View>
                  </View>
                </SwipeableCard>
              );
            })
          )}
        </View>
      </ScrollView>
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
  },
  headerContent: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'NotoSansArabic-Bold',
  },
  inviteButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'NotoSansArabic-Bold',
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
    fontSize: 20,
    color: '#666',
    fontFamily: 'NotoSansArabic-Regular',
  },
  workerCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'NotoSansArabic-Bold',
  },
  workerPosition: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    fontFamily: 'NotoSansArabic-Regular',
  },
  workerRole: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
    fontFamily: 'NotoSansArabic-Regular',
  },
  workerEmail: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
    fontFamily: 'NotoSansArabic-Regular',
  },
  workerActions: {
    alignItems: 'flex-end',
  },
  editPositionButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginBottom: 5,
  },
  editPositionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteWorkerButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  deleteWorkerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  positionEditContainer: {
    marginTop: 8,
  },
  positionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  positionEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
  },
  positionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
  },
  savePositionButton: {
    backgroundColor: '#28a745',
  },
  savePositionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelPositionButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelPositionText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  invitationCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invitationInfo: {
    flex: 1,
  },
  invitationPhone: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'NotoSansArabic-Bold',
  },
  invitationStatus: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
    fontFamily: 'NotoSansArabic-Regular',
  },
  invitationDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: 'NotoSansArabic-Regular',
  },
  invitationExpiry: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontFamily: 'NotoSansArabic-Regular',
  },
});