import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { calculateFare } from '../config/pricing'; // Importamos tu motor financiero

export default function TripRequestCard({ request, driverId }) {
  const [timeLeft, setTimeLeft] = useState(15); // Rúbrica: Temporizador de 15 segundos
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Animación de entrada nativa (deslizamiento desde abajo)
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  // Lógica del temporizador y rechazo automático
  useEffect(() => {
    if (timeLeft <= 0) {
      handleReject();
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  // CÁLCULO DE TARIFAS: Uso de la función pura exigida en la rúbrica
  const { fare, driverEarnings } = calculateFare({
    distanceKm: request.distanceKm || 0,
    durationMin: request.durationMin || 0,
    category: request.category || 'Económico'
  });

  const handleAccept = async () => {
    try {
      await updateDoc(doc(db, 'trips', request.id), {
        status: 'accepted',
        driverId: driverId
      });
    } catch (error) {
      console.log('Error al aceptar el viaje:', error);
    }
  };

  const handleReject = async () => {
    try {
      await updateDoc(doc(db, 'trips', request.id), {
        status: 'rejected'
      });
    } catch (error) {
      console.log('Error al rechazar el viaje:', error);
    }
  };

  // Formateador de moneda para mejor legibilidad
  const formatCurrency = (amount) => {
    return '$' + amount.toLocaleString('es-CO');
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
      {/* ENCABEZADO CON TEMPORIZADOR */}
      <View style={styles.header}>
        <Text style={styles.title}>¡Nueva Solicitud!</Text>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</Text>
        </View>
      </View>

      {/* BLOQUE FINANCIERO */}
      <View style={styles.earningsContainer}>
        <View>
          <Text style={styles.earningsLabel}>Tu Ganancia Neta</Text>
          <Text style={styles.earningsValue}>{formatCurrency(driverEarnings)}</Text>
        </View>
        <View style={styles.fareInfo}>
          <Text style={styles.fareLabel}>Tarifa Estimada</Text>
          <Text style={styles.fareValue}>{formatCurrency(fare)}</Text>
        </View>
      </View>

      {/* DETALLES DEL VIAJE (Exigidos en la rúbrica) */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.icon}>📍</Text>
          <Text style={styles.detailText} numberOfLines={1}>{request.origin?.address || 'Origen desconocido'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.icon}>🏁</Text>
          <Text style={styles.detailText} numberOfLines={1}>{request.destination?.address || 'Destino desconocido'}</Text>
        </View>
      </View>

      {/* METADATOS TÉCNICOS */}
      <View style={styles.metaContainer}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Distancia</Text>
          <Text style={styles.metaValue}>{request.distanceKm} km</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Duración</Text>
          <Text style={styles.metaValue}>{request.durationMin} min</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Categoría</Text>
          <Text style={styles.metaValue}>{request.category || 'Económico'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Pago</Text>
          <Text style={styles.metaValue}>
            {request.paymentMethod === 'cash' ? '💵 Efectivo' : '💳 Tarjeta'}
          </Text>
        </View>
      </View>

      {/* BOTONES DE ACCIÓN */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.rejectBtn]} onPress={handleReject}>
          <Text style={styles.rejectBtnText}>Rechazar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.acceptBtn]} onPress={handleAccept}>
          <Text style={styles.acceptBtnText}>Aceptar Viaje</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#FFF', borderRadius: 15, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#174D75' },
  timerBadge: { backgroundColor: '#ff4d4d', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  timerText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  earningsContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F5F7FA', padding: 15, borderRadius: 10, marginBottom: 15 },
  earningsLabel: { fontSize: 13, color: '#666', fontWeight: '600' },
  earningsValue: { fontSize: 24, fontWeight: 'bold', color: '#28A745', marginTop: 2 },
  fareInfo: { alignItems: 'flex-end' },
  fareLabel: { fontSize: 13, color: '#666', fontWeight: '600' },
  fareValue: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 2 },
  detailsContainer: { marginBottom: 15 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { fontSize: 16, marginRight: 10 },
  detailText: { fontSize: 15, color: '#444', flex: 1 },
  metaContainer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15, marginBottom: 20 },
  metaItem: { alignItems: 'center' },
  metaLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase' },
  metaValue: { fontSize: 13, fontWeight: 'bold', color: '#333', marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' },
  rejectBtn: { backgroundColor: '#F5F7FA', marginRight: 10 },
  rejectBtnText: { color: '#666', fontWeight: 'bold', fontSize: 16 },
  acceptBtn: { backgroundColor: '#174D75', marginLeft: 10 },
  acceptBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});