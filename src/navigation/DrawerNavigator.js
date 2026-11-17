import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TripHistoryScreen from '../screens/TripHistoryScreen';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Inicio"
      screenOptions={{
        headerStyle: { backgroundColor: '#174D75' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        drawerActiveTintColor: '#174D75',
        drawerActiveBackgroundColor: '#e6f0fa',
      }}
    >
      <Drawer.Screen 
        name="Inicio" 
        component={HomeScreen} 
        options={{ title: 'Mapa principal' }} 
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Mi Perfil y Vehículo' }} 
      />
      <Drawer.Screen 
        name="TripHistory" 
        component={TripHistoryScreen} 
        options={{ title: 'Historial de Carreras' }} 
      />
    </Drawer.Navigator>
  );
}