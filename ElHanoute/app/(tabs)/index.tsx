import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/api';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState<boolean>(true);
  const [loadingInvitations, setLoadingInvitations] = useState<boolean>(true);
  const [showAll, setShowAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const INITIAL_COUNT = 5;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchTodaysReceipts(), fetchInvitations()]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchTodaysReceipts();
    fetchInvitations();
  }, [user]);

  const fetchTodaysReceipts = async () => {
    try {
      setLoadingReceipts(true);
      const res = await api.get('/receipts');
      const all: any[] = res.data || [];

      // filter receipts created today (local timezone)
      const today = new Date();
      const isSameDay = (d1: Date, d2: Date) =>
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

      const todays = all.filter(r => {
        const created = new Date(r.createdAt || r.dateOfAdding || Date.now());
        return isSameDay(created, today);
      });

      // sort newest first
      todays.sort((a, b) => new Date(b.createdAt || b.dateOfAdding || 0).getTime() - new Date(a.createdAt || a.dateOfAdding || 0).getTime());

      setReceipts(todays);
    } catch (error) {
      console.error('Error fetching todays receipts:', error);
      setReceipts([]); // Set empty array on error
    } finally {
      setLoadingReceipts(false);
    }
  };

  const fetchInvitations = async () => {
    if (!user) {
      setLoadingInvitations(false);
      return;
    }

    try {
      setLoadingInvitations(true);
      const response = await api.get(`/invitations/user/${user._id}`);
      setInvitations(response.data);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!user) return;

    try {
      await api.post(`/invitations/${invitationId}/accept`, { userId: user._id });
      Alert.alert('Success', 'Invitation accepted! You have been added to the store.');
      fetchInvitations(); // Refresh invitations
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    if (!user) return;

    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/invitations/${invitationId}/decline`, { userId: user._id });
              Alert.alert('Success', 'Invitation declined.');
              fetchInvitations(); // Refresh invitations
            } catch (error: any) {
              console.error('Error declining invitation:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to decline invitation');
            }
          }
        }
      ]
    );
  };
  return (
    <View style={styles.container}>
      {/* Invitations Section */}
      {invitations.length > 0 && (
        <View style={styles.invitationsSection}>
          <Text style={styles.sectionTitle}>دعوات معلقة</Text>
          {loadingInvitations ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <FlatList
              data={invitations}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.invitationCard}>
                  <View style={styles.invitationInfo}>
                    <Text style={styles.invitationStore}>
                      دعوة للانضمام إلى: {item.storeId.name}
                    </Text>
                    <Text style={styles.invitationFrom}>
                      من: {item.invitedBy.name} {item.invitedBy.lastname}
                    </Text>
                    <Text style={styles.invitationDate}>
                      تاريخ الدعوة: {new Date(item.createdAt).toLocaleDateString('ar-DZ')}
                    </Text>
                  </View>
                  <View style={styles.invitationActions}>
                    <TouchableOpacity
                      style={[styles.invitationButton, styles.acceptButton]}
                      onPress={() => handleAcceptInvitation(item._id)}
                    >
                      <Text style={styles.acceptButtonText}>قبول</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.invitationButton, styles.declineButton]}
                      onPress={() => handleDeclineInvitation(item._id)}
                    >
                      <Text style={styles.declineButtonText}>رفض</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          )}
        </View>
      )}

      {/* Receipts Section */}
      <View style={styles.receiptsSection}>
        <View style={styles.receiptsHeader}>
          <Text style={styles.receiptsTitle}>فواتير اليوم</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/receipts')}>
            <Text style={styles.viewAll}>عرض الكل</Text>
          </TouchableOpacity>
        </View>

        {loadingReceipts ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : receipts.length === 0 ? (
          <View style={styles.noReceiptsContainer}>
            <Text style={styles.noReceiptsText}>لا توجد فواتير اليوم</Text>
            <Text style={styles.noReceiptsSubtext}>اسحب لأسفل للتحديث</Text>
          </View>
        ) : (
          <FlatList
            data={showAll ? receipts : receipts.slice(0, INITIAL_COUNT)}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={styles.receiptRow}>
                <View style={styles.receiptInfo}>
                  <Text style={styles.receiptRowId}>#{(item.receiptNumber || item._id || '').toString().slice(-8)}</Text>
                  <Text style={styles.receiptRowCustomer}>{item.customerId?.name || 'زبون غير محدد'}</Text>
                  <Text style={styles.receiptRowAddedBy}>
                    أضيف بواسطة: {item.addedBy ? `${item.addedBy.name} ${item.addedBy.lastname || ''}`.trim() : 'غير محدد'}
                  </Text>
                  <Text style={styles.receiptRowDate}>
                    {new Date(item.createdAt || item.dateOfAdding || Date.now()).toLocaleTimeString('ar-DZ', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
                <Text style={styles.receiptRowTotal}>{(item.total || item.pricePayed || 0).toFixed(2)} دج</Text>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListFooterComponent={() => (
              receipts.length > INITIAL_COUNT ? (
                <TouchableOpacity onPress={() => setShowAll(!showAll)} style={styles.showMoreButton}>
                  <Text style={styles.showMoreText}>{showAll ? 'عرض أقل' : `عرض المزيد (${receipts.length - INITIAL_COUNT})`}</Text>
                </TouchableOpacity>
              ) : null
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    paddingBottom: 80, // Account for absolutely positioned tab bar
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 60,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  featuresSection: {
    flex: 1,
    justifyContent: 'center',
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  featureDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'right',
    lineHeight: 24,
  },
  receiptsPreview: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  receiptsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  viewAll: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  noReceiptsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  noReceiptsSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  noReceiptsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  receiptInfo: {
    flex: 1,
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
  receiptRowAddedBy: {
    fontSize: 10,
    color: '#888',
    marginTop: 1,
  },
  receiptRowDate: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  receiptRowTotal: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '700',
  },
  showMoreButton: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  showMoreText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  invitationsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'right',
  },
  invitationCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  invitationInfo: {
    marginBottom: 12,
  },
  invitationStore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'right',
  },
  invitationFrom: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
    textAlign: 'right',
  },
  invitationDate: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  invitationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  invitationButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#dc3545',
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  receiptsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
