import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

import TabNavigator from './TabNavigator'; // Pantallas de registro
import DrawerNavigator from './DrawerNavigator'; // NUEVO: Menú lateral con Mapa, Historial y Perfil

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  // Escucha en tiempo real si el conductor ya completó su registro
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'drivers', 'localDriver'), (docSnap) => {
      if (docSnap.exists()) {
        setIsRegistered(true);
      } else {
        setIsRegistered(false);
      }
      setLoading(false);
    }, (error) => {
      console.log('Error en RootNavigator:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#174D75" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isRegistered ? (
        // Si está registrado, le mostramos el menú lateral (que ya contiene el Mapa, Historial y Perfil)
        <Stack.Screen name="MainApp" component={DrawerNavigator} />
      ) : (
        // Si no está registrado, le mostramos el flujo de registro en pestañas
        <Stack.Screen name="Registro" component={TabNavigator} />
      )}
    </Stack.Navigator>
  );
}