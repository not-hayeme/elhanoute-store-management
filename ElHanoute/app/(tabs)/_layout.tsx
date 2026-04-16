import { Tabs } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Octicons from '@expo/vector-icons/Octicons';

// Force RTL layout for Arabic
I18nManager.forceRTL(true);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, direction: 'rtl' }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#000000',
          tabBarInactiveTintColor: '#000000',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderTopWidth: 0,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'الرئيسية',
            tabBarIcon: ({ color }) => <Octicons name="home" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="items"
          options={{
            title: 'المنتجات',
            tabBarIcon: ({ color }) => <MaterialIcons name="inventory" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="add-item"
          options={{
            title: 'إضافة منتج',
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="receipts"
          options={{
            title: 'الفواتير',
            tabBarIcon: ({ color }) => <Ionicons name="receipt" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="add-receipt"
          options={{
            title: 'إضافة فاتورة',
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="store"
          options={{
            title: 'المتجر',
            tabBarIcon: ({ color }) => <Ionicons name="storefront" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'الملف الشخصي',
            tabBarIcon: ({ color }) => <FontAwesome5 name="user" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="roles"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="customers"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>

      {/* Floating Receipt Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => router.push('/(tabs)/add-receipt')}
        activeOpacity={1}
      >
        <Ionicons name="receipt" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 30, // Position directly on top of the tab bar
    alignSelf: 'center', // Center horizontally
    backgroundColor: '#007AFF', // Blue color for receipts
    width: 64,
    height: 64,
    borderRadius: 16, // More square-like with less rounded corners
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
});
