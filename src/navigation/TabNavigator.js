
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import PersonalDetails from '../screens/PersonalDetails';
import CarDetails from '../screens/CarDetails';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitle: 'UberClone Conductor',
        headerStyle: {
          backgroundColor: '#174D75',
        },
        headerTintColor: '#FFFFFF',
        tabBarActiveTintColor: '#174D75',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: {
          height: 65,
          paddingBottom: 8,
          paddingTop: 5,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Datos personales') {
            iconName = 'person-circle-outline';
          } else {
            iconName = 'car-outline';
          }

          return (
            <Ionicons
              name={iconName}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Datos personales"
        component={PersonalDetails}
      />

      <Tab.Screen
        name="Vehículo"
        component={CarDetails}
      />
    </Tab.Navigator>
  );
}


