import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { useTripRequests } from '../hooks/useTripRequests';
import { useActiveTrip } from '../hooks/useActiveTrip';
import { usePushNotifications } from '../hooks/usePushNotifications';
import TripRequestCard from '../components/TripRequestCard';
import ActiveTripPanel from '../components/ActiveTripPanel';

// Token de OpenRouteService (Alternativa gratuita contemplada en la sección 7)
const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjFhZDc3ZjZlODdiMzQ4OTc4YWZjNzI0MDU1ZDc4OWUyIiwiaCI6Im11cm11cjY0In0=';

export default function HomeScreen({ navigation }) {
  const [driverData, setDriverData] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState([]);
  const mapRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setLoading(true);

      const fetchDriverStatus = async () => {
        try {
          const docRef = doc(db, 'drivers', 'localDriver');
          const docSnap = await getDoc(docRef);

          if (docSnap.exists() && isMounted) {
            const data = docSnap.data();
            setDriverData(data);
            setIsAvailable(data.isAvailable || false);
          }
        } catch (error) {
          console.log('Error obteniendo perfil del conductor:', error);
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      fetchDriverStatus();
      return () => { isMounted = false; };
    }, [])
  );

  const { location, errorMsg } = useDriverLocation(isAvailable, 'localDriver');
  const { activeRequest } = useTripRequests(isAvailable);
  const { activeTrip } = useActiveTrip('localDriver');

  // Hook de notificaciones locales
  usePushNotifications('localDriver', isAvailable);

  // Determinar si estamos yendo por el pasajero o hacia el destino final
  const isGoingToPickup = activeTrip?.status === 'accepted' || activeTrip?.status === 'driver_arriving';
  const isGoingToDestination = activeTrip?.status === 'in_progress';
  const shouldShowRoute = isGoingToPickup || isGoingToDestination;

  const targetPoint = isGoingToPickup
    ? activeTrip?.origin
    : isGoingToDestination
    ? activeTrip?.destination
    : null;

  // Trazado de ruta con OpenRouteService (solo se ejecuta al cambiar el estado del viaje, no en cada paso del GPS)
  useEffect(() => {
    if (!shouldShowRoute || !location || !targetPoint?.lat || !targetPoint?.lng) {
      setRouteCoords([]);
      return;
    }

    const fetchRouteFromORS = async () => {
      const startCoords = `${location.longitude},${location.latitude}`;
      const endCoords = `${targetPoint.lng},${targetPoint.lat}`;
      const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startCoords}&end=${endCoords}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          // OpenRouteService devuelve [longitud, latitud], lo invertimos para react-native-maps
          const points = data.features[0].geometry.coordinates.map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng,
          }));

          setRouteCoords(points);

          if (mapRef.current && points.length > 0) {
            mapRef.current.fitToCoordinates(points, {
              edgePadding: { right: 50, bottom: 300, left: 50, top: 100 },
              animated: true,
            });
          }
        } else {
          // Respaldo en línea recta si las coordenadas de prueba están fuera de rango vial
          setRouteCoords([
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: targetPoint.lat, longitude: targetPoint.lng },
          ]);
        }
      } catch (error) {
        console.log('Error obteniendo ruta de OpenRouteService:', error);
        setRouteCoords([
          { latitude: location.latitude, longitude: location.longitude },
          { latitude: targetPoint.lat, longitude: targetPoint.lng },
        ]);
      }
    };

    fetchRouteFromORS();
  }, [activeTrip?.id, activeTrip?.status, Boolean(location)]);

  const toggleAvailability = async () => {
    if (!driverData) return;
    if (driverData.status === 'pending') {
      Alert.alert('Cuenta en revisión', 'Tu cuenta está pendiente de aprobación.');
      return;
    }
    if (activeTrip && isAvailable) {
      Alert.alert('Viaje en curso', 'No puedes desconectarte mientras tienes un viaje activo.');
      return;
    }

    const newAvailability = !isAvailable;
    setIsAvailable(newAvailability);

    try {
      await updateDoc(doc(db, 'drivers', 'localDriver'), {
        isAvailable: newAvailability
      });
      setDriverData(prev => ({ ...prev, isAvailable: newAvailability }));
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar tu estado.');
      setIsAvailable(!newAvailability);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#174D75" />
        <Text style={styles.loadingText}>Cargando mapa y datos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation={true}
        followsUserLocation={!activeTrip}
        initialRegion={{
          latitude: location ? location.latitude : 6.2442,
          longitude: location ? location.longitude : -75.5812,
          latitudeDelta: 0.015,
          longitudeDelta: 0.012,
        }}
        region={
          location && !activeTrip
            ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.015, longitudeDelta: 0.012 }
            : undefined
        }
      >
        {location && (
          <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} title="Tú" />
        )}

        {/* MARCADOR DE OBJETIVO Y LÍNEA DE RUTA (POLYLINE) */}
        {shouldShowRoute && targetPoint && (
          <>
            <Marker
              coordinate={{
                latitude: targetPoint.lat,
                longitude: targetPoint.lng,
              }}
              title={isGoingToPickup ? 'Punto de recogida' : 'Destino final'}
              pinColor={isGoingToPickup ? 'green' : 'red'}
            />

            {routeCoords.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeWidth={4}
                strokeColor="#174D75"
              />
            )}
          </>
        )}
      </MapView>

      {!activeRequest && !activeTrip && (
        <View style={styles.topCard}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              {isAvailable ? 'Estás Disponible' : 'Estás Desconectado'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {isAvailable
                ? 'Buscando viajes cercanos...'
                : driverData?.status === 'pending'
                  ? 'Cuenta pendiente'
                  : 'Conéctate para recibir solicitudes'}
            </Text>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: '#28A745' }}
            thumbColor={isAvailable ? '#ffffff' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleAvailability}
            value={isAvailable}
            style={styles.switchControl}
          />
        </View>
      )}

      {errorMsg && !activeRequest && !activeTrip && (
        <View style={styles.errorCard}><Text style={styles.errorText}>{errorMsg}</Text></View>
      )}

      {activeRequest && !activeTrip && <TripRequestCard request={activeRequest} driverId="localDriver" />}
      {activeTrip && <ActiveTripPanel trip={activeTrip} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { width: '100%', height: '100%' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  topCard: { position: 'absolute', top: 20, left: 20, right: 20, backgroundColor: 'white', borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statusSubtitle: { fontSize: 12, color: '#666', marginTop: 4 },
  switchControl: { transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }], marginLeft: 10 },
  errorCard: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: '#ff4d4d', padding: 15, borderRadius: 10, alignItems: 'center' },
  errorText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
});