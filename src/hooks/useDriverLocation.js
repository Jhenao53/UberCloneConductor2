import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export const useDriverLocation = (isAvailable, driverId = 'localDriver') => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let locationSubscription = null;

    const startTracking = async () => {
      try {
        // 1. Pedir permisos al usuario
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Se requiere permiso para acceder a la ubicación.');
          return;
        }

        // 2. Iniciar el seguimiento
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000, // Actualizar cada 5 segundos
            distanceInterval: 10, // O cada 10 metros de movimiento
          },
          (newLocation) => {
            if (isMounted) {
              const coords = {
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                heading: newLocation.coords.heading || 0, // para girar el ícono del carro en el mapa
              };

              setLocation(coords);

              // 3. Sincronizar con Firebase Firestore en tiempo real
              // Solo se envía a Firebase si isAvailable es true
              if (isAvailable && driverId) {
                updateDoc(doc(db, 'drivers', driverId), {
                  location: coords,
                  isAvailable: true,
                  updatedAt: new Date(),
                }).catch((error) => console.log('Error actualizando ubicación en BD:', error));
              }
            }
          }
        );

        // Prevenir fugas de memoria si el componente se desmontó mientras cargaba
        if (isMounted) {
          locationSubscription = subscription;
        } else {
          subscription.remove();
        }

      } catch (error) {
        console.error("Error al iniciar el GPS:", error);
      }
    };

    //  Encender o apagar
    if (isAvailable) {
      startTracking();
    } else {
      // Si el conductor se pone "No disponible", informamos a Firestore
      if (driverId) {
        updateDoc(doc(db, 'drivers', driverId), {
          isAvailable: false
        }).catch(err => console.log(err));
      }
    }

    // 4. FUNCIÓN DE LIMPIEZA OBLIGATORIA
    // Se ejecuta al salir de la pantalla o al pasar a "No disponible"
    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove(); // Detiene el consumo de GPS y batería
      }
    };
  }, [isAvailable, driverId]);

  return { location, errorMsg };
};