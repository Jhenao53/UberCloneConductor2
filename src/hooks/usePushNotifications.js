import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// Configurar comportamiento de la notificación en pantalla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const usePushNotifications = (driverId, isAvailable) => {
  const lastTripId = useRef(null); // Evita que la misma alerta suene dos veces

  // 1. Pedir permisos al iniciar
  useEffect(() => {
    const setupNotifications = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Nuevos Viajes',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#174D75',
        });
      }
      await Notifications.requestPermissionsAsync();
    };
    setupNotifications();
  }, []);

  // 2. Escuchar nuevos viajes de forma local
  useEffect(() => {
    if (!isAvailable || !driverId) return;

    const q = query(
      collection(db, 'trips'),
      where('status', '==', 'requested')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filtrar solo los documentos "añadidos" o modificados a requested
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const currentTripId = change.doc.id;

          // Validar que no hayamos notificado ya sobre este viaje
          if (lastTripId.current !== currentTripId) {
            lastTripId.current = currentTripId;
            
            // Disparar notificación nativa inmediatamente
            Notifications.scheduleNotificationAsync({
              content: {
                title: '¡Nuevo viaje cerca de ti! 🚗',
                body: `Ganancia estimada: $${data.driverEarnings || 0}. Toca para aceptar.`,
                sound: true,
              },
              trigger: null,
            });
          }
        }
      });
    });

    return () => unsubscribe();
  }, [isAvailable, driverId]);
};