import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ActivityIndicator, View, Text, Image } from 'react-native';
import { useFonts } from 'expo-font';

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const colorScheme = useColorScheme();

  const [fontsLoaded, fontError] = useFonts({
    'NotoSansArabic-Regular': require('../assets/fonts/NotoSansArabic-Regular.ttf'),
    'NotoSansArabic-Bold': require('../assets/fonts/NotoSansArabic-Bold.ttf'),
    'NotoSansArabic-Medium': require('../assets/fonts/NotoSansArabic-Medium.ttf'),
  });

  if (isLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <Image
          source={require('../assets/images/icon.png')}
          style={{ width: 150, height: 150, marginBottom: 30 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#007AFF" />
        {!fontsLoaded && <Text style={{ marginTop: 10, fontSize: 16, color: '#666' }}>جاري تحميل الخطوط...</Text>}
        {isLoading && <Text style={{ marginTop: 10, fontSize: 16, color: '#666' }}>جاري التحقق من المصادقة...</Text>}
      </View>
    );
  }

  if (fontError) {
    console.error('Font loading error:', fontError);
    // Continue without custom fonts if they fail to load
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {isAuthenticated ? (
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="login" options={{ headerShown: false }} />
        )}
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
