import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export function useTripRequests(isAvailable) {
  const [activeRequest, setActiveRequest] = useState(null);

  useEffect(() => {
    // Si el conductor no está disponible, no buscamos viajes
    if (!isAvailable) {
      setActiveRequest(null);
      return;
    }

    // Buscamos viajes que estén esperando un conductor
    const q = query(
      collection(db, 'trips'),
      where('status', '==', 'requested')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          // Tomamos la primera solicitud disponible
          const docSnap = snapshot.docs[0];
          setActiveRequest({ id: docSnap.id, ...docSnap.data() });
        } else {
          setActiveRequest(null);
        }
      },
      (error) => {
        console.log('Error en useTripRequests:', error);
      }
    );

    return () => unsubscribe();
  }, [isAvailable]);

  return { activeRequest };
}