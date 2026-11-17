import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export function useActiveTrip(driverId) {
  const [activeTrip, setActiveTrip] = useState(null);

  useEffect(() => {
    if (!driverId) return;

    // Consulta simple de un solo filtro para evitar el bloqueo de Índice Compuesto de Firebase
    const q = query(
      collection(db, 'trips'),
      where('driverId', '==', driverId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Los estados válidos para que el viaje se considere "Activo"
        const validStatuses = ['accepted', 'driver_arriving', 'in_progress', 'completed', 'paid'];
        
        // Filtramos en memoria en lugar de usar un query complejo
        const openDocs = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((trip) => validStatuses.includes(trip.status) && !trip.summaryClosed);

        if (openDocs.length > 0) {
          setActiveTrip(openDocs[0]);
        } else {
          setActiveTrip(null);
        }
      },
      (error) => {
        console.log('Error en useActiveTrip:', error);
      }
    );

    return () => unsubscribe();
  }, [driverId]);

  return { activeTrip };
}