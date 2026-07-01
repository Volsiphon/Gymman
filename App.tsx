import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { RootNavigator } from '@/app/navigation';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { SubscriptionProvider } from '@/app/providers/SubscriptionProvider';
import { colors } from '@/theme/colors';

function App() {
  const [fontsLoaded] = useFonts({
    Anton_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg.app }} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </SubscriptionProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
registerRootComponent(App);

