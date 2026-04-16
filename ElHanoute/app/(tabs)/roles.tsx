import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/api';

interface Role {
  _id: string;
  name: string;
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
  users: any[];
  storeId: string;
}

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

export default function RolesWorkersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showRoleDetailsModal, setShowRoleDetailsModal] = useState(false);
  const [store, setStore] = useState<any>(null);
  const [modifiedPermissions, setModifiedPermissions] = useState<{[roleId: string]: Role['permissions']}>({});
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch user's store
      const storesResponse = await api.get('/stores');
      const stores = storesResponse.data;
      const userStore = stores.find((store: any) => store.ownerId._id === user._id);

      if (!userStore) {
        Alert.alert('خطأ', 'لم يتم العثور على متجر');
        return;
      }

      setStore(userStore);

      // Fetch roles for the store
      const rolesResponse = await api.get(`/roles?storeId=${userStore._id}`);
      console.log('Raw roles response:', rolesResponse.data);
      setRoles(rolesResponse.data);

      // Set workers from store
      const workersData = userStore.workers || [];
      console.log('Workers data:', workersData);
      console.log('Workers data structure check:');
      workersData.forEach((worker: Worker, index: number) => {
        console.log(`Worker ${index}:`, {
          _id: worker?._id,
          userId: worker?.userId,
          userIdType: typeof worker?.userId,
          position: worker?.position
        });
      });
      setWorkers(workersData);

      console.log('Store workers:', userStore.workers);
      console.log('Roles:', rolesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const createRole = async () => {
    if (!newRoleName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الدور');
      return;
    }

    if (!store || !user) {
      Alert.alert('خطأ', 'بيانات المتجر غير متوفرة');
      return;
    }

    try {
      setCreatingRole(true);

      const response = await api.post('/roles', {
        name: newRoleName,
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
      });

      setRoles([...roles, response.data]);
      setNewRoleName('');
      setShowAddRoleModal(false);
      Alert.alert('نجح', 'تم إنشاء الدور بنجاح');
    } catch (error) {
      console.error('Error creating role:', error);
      Alert.alert('خطأ', 'فشل في إنشاء الدور');
    } finally {
      setCreatingRole(false);
    }
  };

  const updateRolePermissions = async (roleId: string, permissions: any) => {
    try {
      await api.put(`/roles/${roleId}`, { permissions });

      // Update local state
      setRoles(roles.map(role =>
        role._id === roleId ? { ...role, permissions } : role
      ));

      if (selectedRole && selectedRole._id === roleId) {
        setSelectedRole({ ...selectedRole, permissions });
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      Alert.alert('خطأ', 'فشل في تحديث الصلاحيات');
    }
  };

  const deleteRole = async (roleId: string) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذا الدور؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/roles/${roleId}`);

              setRoles(roles.filter(role => role._id !== roleId));
              Alert.alert('نجح', 'تم حذف الدور بنجاح');
            } catch (error) {
              console.error('Error deleting role:', error);
              Alert.alert('خطأ', 'فشل في حذف الدور');
            }
          }
        }
      ]
    );
  };

  const saveRolePermissions = async () => {
    if (!selectedRole) return;

    const permissionsToSave = modifiedPermissions[selectedRole._id];
    if (!permissionsToSave) return;

    try {
      setSavingPermissions(true);
      await api.put(`/roles/${selectedRole._id}`, { permissions: permissionsToSave });

      // Update local state
      setRoles(roles.map(role =>
        role._id === selectedRole._id ? { ...role, permissions: permissionsToSave } : role
      ));

      setSelectedRole({ ...selectedRole, permissions: permissionsToSave });
      setModifiedPermissions(prev => {
        const newState = { ...prev };
        delete newState[selectedRole._id];
        return newState;
      });

      Alert.alert('نجح', 'تم حفظ الصلاحيات بنجاح');
    } catch (error) {
      console.error('Error saving permissions:', error);
      Alert.alert('خطأ', 'فشل في حفظ الصلاحيات');
    } finally {
      setSavingPermissions(false);
    }
  };

  const addUserToRole = async (userId: string) => {
    if (!selectedRole) return;

    try {
        // First, check if user is already in another role and remove them
        const otherRoles = roles.filter(role => role._id !== selectedRole._id);
        for (const role of otherRoles) {
        const usersInRole = getUsersInRole(role);
        const userExists = usersInRole.some(worker => {
            const workerUserId = typeof worker.userId === 'object' ? worker.userId._id : worker.userId;
            return workerUserId === userId;
        });

        if (userExists) {
            console.log(`Removing user ${userId} from role ${role.name}`);
            await api.delete(`/roles/${role._id}/users/${userId}`);
            // Update local state for the other role
            const updatedOtherRole = {
            ...role,
            users: role.users.filter(user => {
                const userIdToCompare = typeof user === 'object' && user ? user._id : user;
                return userIdToCompare !== userId;
            })
            };
            setRoles(prevRoles => prevRoles.map(r => r._id === role._id ? updatedOtherRole : r));
            break; // User can only be in one role, so we can stop after finding them
        }
        }

        // Now add user to the selected role
        const response = await api.post(`/roles/${selectedRole._id}/users`, { userId });

        // Update local state with the response data (which includes populated users)
        setSelectedRole(response.data);
        setRoles(roles.map(role =>
        role._id === selectedRole._id ? response.data : role
        ));

        Alert.alert('نجح', 'تم إضافة المستخدم إلى الدور بنجاح');
    } catch (error) {
        console.error('Error adding user to role:', error);
        Alert.alert('خطأ', 'فشل في إضافة المستخدم إلى الدور');
    }
    };

  const removeUserFromRole = async (userId: string) => {
    if (!selectedRole) return;

    Alert.alert(
      'إزالة المستخدم',
      'هل أنت متأكد من إزالة هذا المستخدم من الدور؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إزالة',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/roles/${selectedRole._id}/users/${userId}`);

              // Update local state with the response data (which includes populated users)
              setSelectedRole(response.data);
              setRoles(roles.map(role =>
                role._id === selectedRole._id ? response.data : role
              ));

              Alert.alert('نجح', 'تم إزالة المستخدم من الدور بنجاح');
            } catch (error) {
              console.error('Error removing user from role:', error);
              Alert.alert('خطأ', 'فشل في إزالة المستخدم من الدور');
            }
          }
        }
      ]
    );
  };

  const getUsersInRole = (role: Role) => {
    console.log('Getting users for role:', role.name);
    console.log('Role users array:', role.users);
    console.log('Role users length:', role.users?.length || 0);
    console.log('Available workers:', workers.length);

    if (!role.users || role.users.length === 0) {
      console.log('No users in role');
      return [];
    }

    if (!workers || workers.length === 0) {
      console.log('No workers available');
      return [];
    }

    // Extract user IDs from role.users (handles both populated objects and IDs)
    const roleUserIds = role.users.map(user => {
      if (typeof user === 'object' && user && user._id) {
        return user._id;
      } else if (typeof user === 'string') {
        return user;
      }
      return null;
    }).filter(id => id !== null);

    console.log('Role user IDs:', roleUserIds);

    // Find workers whose userId matches the role user IDs
    const matchedWorkers = workers.filter(worker => {
      const workerUserId = typeof worker.userId === 'object' ? worker.userId._id : worker.userId;
      const isMatch = roleUserIds.includes(workerUserId);
      console.log(`Worker ${worker._id}: userId=${workerUserId}, matches=${isMatch}`);
      return isMatch;
    });

    console.log('Matched workers:', matchedWorkers.length);
    return matchedWorkers;
  };

  const getRoleName = (roleId?: string) => {
    if (!roleId) return 'غير محدد';
    const role = roles.find(r => r._id === roleId);
    return role ? role.name : 'غير محدد';
  };

  const getAvailableWorkersForRole = (role: Role) => {
    if (!workers || workers.length === 0) {
      return [];
    }

    // Get users already in this role
    const usersInRole = getUsersInRole(role);
    const usersInRoleIds = usersInRole.map(worker => 
      typeof worker.userId === 'object' ? worker.userId._id : worker.userId
    );

    // Return workers not in this role
    return workers.filter(worker => {
      const workerUserId = typeof worker.userId === 'object' ? worker.userId._id : worker.userId;
      return !usersInRoleIds.includes(workerUserId);
    });
  };

  const renderPermissionSquare = (title: string, permissions: { label: string; key: keyof Role['permissions'] }[], role: Role) => {
    const currentPermissions = modifiedPermissions[role._id] || role.permissions;

    return (
      <View key={title} style={styles.permissionSquare}>
        <Text style={styles.squareTitle}>{title}</Text>
        {permissions.map((perm) => (
          <View key={perm.key} style={styles.permissionRow}>
            <Text style={styles.permissionLabel}>{perm.label}</Text>
            <Switch
              value={currentPermissions[perm.key]}
              onValueChange={(value) => {
                const updatedPermissions = { ...currentPermissions, [perm.key]: value };
                setModifiedPermissions(prev => ({
                  ...prev,
                  [role._id]: updatedPermissions
                }));
              }}
            />
          </View>
        ))}
      </View>
    );
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
          contentFit="contain"
        />
        <Text style={styles.headerTitle}>إدارة الأدوار والعاملين</Text>
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
            workers.map((worker) => (
              <View key={worker._id} style={styles.workerCard}>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>
                    {worker.userId && typeof worker.userId === 'object' && worker.userId.name
                      ? `${worker.userId.name} ${worker.userId.lastname || ''}`.trim()
                      : worker.userId && typeof worker.userId === 'object' && worker.userId._id
                      ? `معرف المستخدم: ${worker.userId._id.substring(0, 8)}...`
                      : 'بيانات المستخدم غير متوفرة'}
                  </Text>
                  <Text style={styles.workerPosition}>{worker.position || 'غير محدد'}</Text>
                  <Text style={styles.workerRole}>
                    الدور: {getRoleName(worker.roleId)}
                  </Text>
                  <Text style={styles.workerEmail}>
                    {worker.userId && typeof worker.userId === 'object' && worker.userId.email
                      ? worker.userId.email
                      : 'البريد الإلكتروني غير متوفر'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Roles Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>الأدوار ({roles.length.toLocaleString('en-US')})</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddRoleModal(true)}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Create New Role Button */}
          <TouchableOpacity
            style={styles.createRoleSectionButton}
            onPress={() => setShowAddRoleModal(true)}
          >
            <Text style={styles.createRoleSectionText}>إنشاء دور جديد</Text>
          </TouchableOpacity>

          {roles.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>لا توجد أدوار في المتجر</Text>
            </View>
          ) : (
            roles.map((role) => (
              <TouchableOpacity
                key={role._id}
                style={styles.roleCard}
                onPress={() => {
                  setSelectedRole(role);
                  setShowRoleDetailsModal(true);
                }}
              >
                <View style={styles.roleHeader}>
                  <Text style={styles.roleName}>{role.name}</Text>
                  <Text style={styles.roleUsersCount}>
                    المستخدمون: {role.users.length.toLocaleString('en-US')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteRoleButton}
                  onPress={() => deleteRole(role._id)}
                >
                  <Text style={styles.deleteRoleText}>حذف</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Role Modal */}
      <Modal
        visible={showAddRoleModal}
        onRequestClose={() => setShowAddRoleModal(false)}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowAddRoleModal(false)}
            >
              <Text style={styles.closeModalText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>إضافة دور جديد</Text>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.roleNameInput}
              placeholder="اسم الدور"
              value={newRoleName}
              onChangeText={setNewRoleName}
              maxLength={50}
            />

            <TouchableOpacity
              style={[styles.createRoleButton, creatingRole && styles.createRoleButtonDisabled]}
              onPress={createRole}
              disabled={creatingRole}
            >
              {creatingRole ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createRoleText}>إنشاء الدور</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Role Details Modal */}
      <Modal
        visible={showRoleDetailsModal}
        onRequestClose={() => {
          setShowRoleDetailsModal(false);
          setModifiedPermissions(prev => {
            const newState = { ...prev };
            if (selectedRole) delete newState[selectedRole._id];
            return newState;
          });
        }}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                setShowRoleDetailsModal(false);
                setModifiedPermissions(prev => {
                  const newState = { ...prev };
                  if (selectedRole) delete newState[selectedRole._id];
                  return newState;
                });
              }}
            >
              <Text style={styles.closeModalText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedRole?.name} - إدارة الدور
            </Text>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedRole && (
              <View>
                {/* Permissions Section */}
                <View style={styles.permissionsSection}>
                  <Text style={styles.sectionTitle}>الصلاحيات</Text>
                  <View style={styles.permissionsGrid}>
                    {/* Items Permissions */}
                    {renderPermissionSquare('المنتجات', [
                      { label: 'عرض المخزون الكامل', key: 'viewingFullInventory' },
                      { label: 'إضافة المنتجات', key: 'addingItems' },
                      { label: 'تعديل المنتجات', key: 'editingItems' },
                      { label: 'حذف المنتجات', key: 'deletingItems' },
                    ], selectedRole)}

                    {/* Customers Permissions */}
                    {renderPermissionSquare('العملاء', [
                      { label: 'إضافة العملاء', key: 'addingCustomers' },
                      { label: 'تعديل العملاء', key: 'editingCustomer' },
                      { label: 'حذف العملاء', key: 'deletingCustomers' },
                    ], selectedRole)}

                    {/* Users Permissions */}
                    {renderPermissionSquare('المستخدمين', [
                      { label: 'تعيين المستخدمين', key: 'assigningUsersFromStore' },
                      { label: 'إزالة المستخدمين', key: 'deletingUsersFromStore' },
                    ], selectedRole)}

                    {/* Receipts Permissions */}
                    {renderPermissionSquare('الفواتير', [
                      { label: 'عرض جميع الفواتير', key: 'viewingAllReceipts' },
                      { label: 'تعديل الفواتير', key: 'editingReceipts' },
                      { label: 'حذف الفواتير', key: 'deletingReceipts' },
                    ], selectedRole)}
                  </View>

                  {/* Save Permissions Button */}
                  {modifiedPermissions[selectedRole._id] && (
                    <TouchableOpacity
                      style={[styles.savePermissionsButton, savingPermissions && styles.savePermissionsButtonDisabled]}
                      onPress={saveRolePermissions}
                      disabled={savingPermissions}
                    >
                      {savingPermissions ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.savePermissionsText}>حفظ الصلاحيات</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Users in Role Section */}
                <View style={styles.usersSection}>
                  <Text style={styles.sectionTitle}>
                    المستخدمون في هذا الدور ({getUsersInRole(selectedRole).length.toLocaleString('en-US')})
                  </Text>

                  {getUsersInRole(selectedRole).length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>لا يوجد مستخدمون في هذا الدور</Text>
                    </View>
                  ) : (
                    getUsersInRole(selectedRole).map((worker) => (
                      <View key={worker._id} style={styles.roleUserCard}>
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>
                            {worker.userId && typeof worker.userId === 'object' && worker.userId.name
                              ? `${worker.userId.name} ${worker.userId.lastname || ''}`.trim()
                              : worker.userId && typeof worker.userId === 'object' && worker.userId._id
                              ? `معرف المستخدم: ${worker.userId._id.substring(0, 8)}...`
                              : 'بيانات المستخدم غير متوفرة'}
                          </Text>
                          <Text style={styles.userPosition}>{worker.position || 'غير محدد'}</Text>
                          <Text style={styles.userEmail}>
                            {worker.userId && typeof worker.userId === 'object' && worker.userId.email
                              ? worker.userId.email
                              : 'البريد الإلكتروني غير متوفر'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeUserButton}
                          onPress={() => {
                            const userId = typeof worker.userId === 'object' ? worker.userId._id : worker.userId;
                            if (userId) {
                              removeUserFromRole(userId);
                            }
                          }}
                        >
                          <Text style={styles.removeUserText}>إزالة</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>

                {/* Add Users Section */}
                <View style={styles.addUsersSection}>
                  <Text style={styles.sectionTitle}>
                    إضافة مستخدمين ({getAvailableWorkersForRole(selectedRole).length.toLocaleString('en-US')})
                  </Text>

                  {getAvailableWorkersForRole(selectedRole).length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>جميع العاملين في أدوار أخرى</Text>
                    </View>
                  ) : (
                    getAvailableWorkersForRole(selectedRole).map((worker) => (
                      <View key={worker._id} style={styles.availableUserCard}>
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>
                            {worker.userId && typeof worker.userId === 'object' && worker.userId.name
                              ? `${worker.userId.name} ${worker.userId.lastname || ''}`.trim()
                              : worker.userId && typeof worker.userId === 'object' && worker.userId._id
                              ? `معرف المستخدم: ${worker.userId._id.substring(0, 8)}...`
                              : 'بيانات المستخدم غير متوفرة'}
                          </Text>
                          <Text style={styles.userPosition}>{worker.position || 'غير محدد'}</Text>
                          <Text style={styles.userEmail}>
                            {worker.userId && typeof worker.userId === 'object' && worker.userId.email
                              ? worker.userId.email
                              : 'البريد الإلكتروني غير متوفر'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.addUserButton}
                          onPress={() => {
                            const userId = typeof worker.userId === 'object' ? worker.userId._id : worker.userId;
                            if (userId) {
                              addUserToRole(userId);
                            }
                          }}
                        >
                          <Text style={styles.addUserText}>إضافة</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
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
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
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
  roleCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleHeader: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'NotoSansArabic-Bold',
  },
  roleUsersCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    fontFamily: 'NotoSansArabic-Regular',
  },
  deleteRoleButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteRoleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  roleNameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 20,
    fontFamily: 'NotoSansArabic-Regular',
    textAlign: 'right',
  },
  createRoleButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createRoleButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createRoleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'NotoSansArabic-Bold',
  },
  permissionsGrid: {
    flexDirection: 'column',
  },
  permissionSquare: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#007AFF',
    width: '100%',
  },
  squareTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'NotoSansArabic-Bold',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  permissionLabel: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'NotoSansArabic-Regular',
    flex: 1,
    marginRight: 8,
  },
  permissionsSection: {
    marginBottom: 20,
  },
  savePermissionsButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  savePermissionsButtonDisabled: {
    backgroundColor: '#ccc',
  },
  savePermissionsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'NotoSansArabic-Bold',
  },
  usersSection: {
    marginTop: 20,
  },
  roleUserCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'NotoSansArabic-Bold',
  },
  userPosition: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    fontFamily: 'NotoSansArabic-Regular',
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
    fontFamily: 'NotoSansArabic-Regular',
  },
  removeUserButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  removeUserText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  createRoleSectionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  createRoleSectionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'NotoSansArabic-Bold',
  },
  addUsersSection: {
    marginTop: 20,
  },
  availableUserCard: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  addUserButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addUserText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});