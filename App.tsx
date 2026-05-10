import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from '@/navigation/RootNavigator';
import { colors } from '@/constants/colors';

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <RootNavigator />
    </NavigationContainer>
  );
}
