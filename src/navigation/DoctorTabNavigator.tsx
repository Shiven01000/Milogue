import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { DoctorPatientsScreen } from '@/screens/doctor/DoctorPatientsScreen';
import { DoctorSettingsScreen } from '@/screens/doctor/DoctorSettingsScreen';
import { DoctorTabParamList } from './types';
import { colors } from '@/constants/colors';

const Tab = createBottomTabNavigator<DoctorTabParamList>();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
    </View>
  );
}

export function DoctorTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="DoctorPatients"
        component={DoctorPatientsScreen}
        options={{
          tabBarLabel: 'Patients',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏥" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="DoctorSettings"
        component={DoctorSettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconPill: { width: 40, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconPillActive: { backgroundColor: colors.primaryFaint },
});
