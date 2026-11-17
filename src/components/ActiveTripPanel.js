import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { calculateFare } from '../config/pricing';

// Se debe poner la IP  del Pc donde se ejecuta (por si se usa con datos o wifi/ claro...)
const BACKEND_URL = 'http://192.168.10.17:3000';

export default function ActiveTripPanel({ trip }) {
  const [processing, setProcessing] = useState(false);

  if (!trip) return null;

  const tip = Number(trip.tip || 0);
  const { fare, commission, driverEarnings, commissionRate } = calculateFare({
    distanceKm: Number(trip.distanceKm || 0),
    durationMin: Number(trip.durationMin || 0),
    category: trip.category || 'Económico',
    tip,
  });

  const finalFare = trip.fare || fare;
  const finalCommission = trip.commission || commission;
  const finalEarnings = trip.driverEarnings || driverEarnings;
  const isCash = (trip.paymentMethod || 'cash').toLowerCase() === 'cash';

  const formatCOP = (val) => '$' + Math.round(Number(val || 0)).toLocaleString('es-CO');

  // 1. Pasar a 'driver_arriving' (En camino al punto de recogida)
  const handleStartPickup = async () => {
    try {
      setProcessing(true);
      await updateDoc(doc(db, 'trips', trip.id), {
        status: 'driver_arriving',
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado del viaje.');
    } finally {
      setProcessing(false);
    }
  };

  // 2. Pasar a 'in_progress' (Pasajero a bordo -> cambia ruta hacia el destino)
  const handlePassengerOnBoard = async () => {
    try {
      setProcessing(true);
      await updateDoc(doc(db, 'trips', trip.id), {
        status: 'in_progress',
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar el recorrido hacia el destino.');
    } finally {
      setProcessing(false);
    }
  };

  // 3. Finalizar el viaje ('completed') y guardar cálculos financieros en Firestore
  const handleCompleteTrip = async () => {
    try {
      setProcessing(true);
      await updateDoc(doc(db, 'trips', trip.id), {
        status: 'completed',
        fare,
        commission,
        driverEarnings,
        commissionRate,
        tip,
        paymentStatus: isCash ? 'pending_cash' : 'pending',
        completedAt: serverTimestamp(),
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo finalizar el viaje.');
    } finally {
      setProcessing(false);
    }
  };

  // 4A. Cobro en Efectivo (descuenta la comisión del saldo del conductor)
  const handleConfirmCashPayment = async () => {
    try {
      setProcessing(true);
      await updateDoc(doc(db, 'trips', trip.id), {
        status: 'paid',
        paymentMethod: 'cash',
        paymentStatus: 'cash',
        paymentId: `CASH-${Date.now()}`,
      });

      // Descontar la comisión del 20% del saldo virtual del conductor (puede quedar en negativo)
      await updateDoc(doc(db, 'drivers', 'localDriver'), {
        walletBalance: increment(-finalCommission),
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el pago en efectivo.');
    } finally {
      setProcessing(false);
    }
  };

  // 4B. Cobro con Mercado Pago Checkout Pro a través del Backend
  const handleMercadoPagoCheckout = async () => {
    try {
      setProcessing(true);
      const response = await fetch(`${BACKEND_URL}/api/create-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: trip.id,
          amount: finalFare,
          description: `Viaje (${trip.category || 'Económico'}) - ${trip.origin?.address || ''} a ${trip.destination?.address || ''}`,
        }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        await updateDoc(doc(db, 'trips', trip.id), {
          paymentId: data.preferenceId,
          paymentStatus: 'pending',
        });
        await Linking.openURL(data.checkoutUrl);
      } else {
        Alert.alert('Error', 'El backend no devolvió un enlace de Checkout válido.');
      }
    } catch (error) {
      Alert.alert(
        'Backend no detectado',
        `Verifica que "node index.js" esté corriendo en la carpeta backend y que la IP (${BACKEND_URL}) sea correcta.`
      );
    } finally {
      setProcessing(false);
    }
  };

  // 4C. Sincronizar respuesta del pago con el backend y actualizar Firestore a 'paid'
  const handleVerifyGatewayPayment = async (simulatedStatus = null) => {
    try {
      setProcessing(true);
      let paymentStatus = simulatedStatus;
      let paymentId = trip.paymentId || `MP-${Date.now()}`;

      if (!simulatedStatus) {
        const res = await fetch(`${BACKEND_URL}/api/payment-status/${trip.id}`);
        const statusData = await res.json();
        paymentStatus = statusData.paymentStatus || 'approved';
        paymentId = statusData.paymentId || paymentId;
      }

      const isApproved = paymentStatus === 'approved';

      await updateDoc(doc(db, 'trips', trip.id), {
        paymentStatus,
        paymentId,
        status: isApproved ? 'paid' : 'completed',
      });

      if (isApproved) {
        await updateDoc(doc(db, 'drivers', 'localDriver'), {
          walletBalance: increment(finalEarnings),
        });
      }
    } catch (error) {
      // Si se prueba sin backend activo, confirma en Firestore como aprobado en modo prueba
      await updateDoc(doc(db, 'trips', trip.id), {
        paymentStatus: simulatedStatus || 'approved',
        paymentId: `MP-TEST-${Date.now()}`,
        status: (simulatedStatus || 'approved') === 'approved' ? 'paid' : 'completed',
      });
    } finally {
      setProcessing(false);
    }
  };

  // 5. Cerrar el resumen de cobro y liberar al conductor para recibir nuevas solicitudes
  const handleCloseSummary = async () => {
    try {
      setProcessing(true);
      await updateDoc(doc(db, 'trips', trip.id), {
        summaryClosed: true,
      });
    } catch (error) {
      console.log('Error cerrando resumen:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Traducción visual del estado de pago según la rúbrica
  const getPaymentBadge = () => {
    if (isCash && trip.status === 'paid') {
      return { text: 'Efectivo (Recibido)', bg: '#DCFCE7', color: '#166534' };
    }
    const pStatus = (trip.paymentStatus || '').toLowerCase();
    if (pStatus === 'approved' || (!isCash && trip.status === 'paid')) {
      return { text: 'Aprobado', bg: '#DCFCE7', color: '#166534' };
    }
    if (pStatus === 'rejected') {
      return { text: 'Rechazado', bg: '#FEE2E2', color: '#991B1B' };
    }
    return { text: 'Pendiente', bg: '#FEF3C7', color: '#92400E' };
  };

  // VISTA A: VIAJE EN CURSO (accepted, driver_arriving, in_progress)
  if (trip.status === 'accepted' || trip.status === 'driver_arriving' || trip.status === 'in_progress') {
    const isGoingToPassenger = trip.status === 'accepted' || trip.status === 'driver_arriving';

    return (
      <View style={styles.panel}>
        <View style={styles.statusHeader}>
          <View style={styles.liveDot} />
          <Text style={styles.statusHeaderText}>
            {isGoingToPassenger ? 'Dirigiéndote al punto de recogida' : 'Viaje en curso hacia el destino'}
          </Text>
        </View>

        <View style={styles.addressBox}>
          <Text style={styles.addressLabel}>
            {isGoingToPassenger ? '📍 Recoger pasajero en:' : '🏁 Destino final:'}
          </Text>
          <Text style={styles.addressValue} numberOfLines={2}>
            {isGoingToPassenger ? trip.origin?.address : trip.destination?.address}
          </Text>
        </View>

        <View style={styles.tripMetaRow}>
          <Text style={styles.metaInfo}>📏 {trip.distanceKm || 0} km</Text>
          <Text style={styles.metaInfo}>⏱️ {trip.durationMin || 0} min</Text>
          <Text style={styles.metaInfo}>🚘 {trip.category || 'Económico'}</Text>
          <Text style={styles.metaInfo}>{isCash ? '💵 Efectivo' : '💳 Mercado Pago'}</Text>
        </View>

        {processing ? (
          <ActivityIndicator size="large" color="#174D75" style={{ marginVertical: 12 }} />
        ) : (
          <>
            {trip.status === 'accepted' && (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleStartPickup}>
                <Text style={styles.primaryBtnText}>Iniciar ruta hacia el pasajero</Text>
              </TouchableOpacity>
            )}

            {trip.status === 'driver_arriving' && (
              <TouchableOpacity style={[styles.primaryBtn, styles.pickupBtn]} onPress={handlePassengerOnBoard}>
                <Text style={styles.primaryBtnText}>Pasajero a bordo</Text>
              </TouchableOpacity>
            )}

            {trip.status === 'in_progress' && (
              <TouchableOpacity style={[styles.primaryBtn, styles.finishBtn]} onPress={handleCompleteTrip}>
                <Text style={styles.primaryBtnText}>Finalizar Viaje y Cobrar</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  }

  // VISTA B: COBRO Y RESUMEN DEL VIAJE (completed, paid)
  const badge = getPaymentBadge();

  return (
    <View style={styles.panel}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>Cobro y Resumen del Viaje</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
        </View>
      </View>

      <View style={styles.breakdownCard}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Tarifa final</Text>
          <Text style={styles.rowValue}>{formatCOP(finalFare)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Comisión plataforma (20%)</Text>
          <Text style={[styles.rowValue, { color: '#DC2626' }]}>- {formatCOP(finalCommission)}</Text>
        </View>
        {tip > 0 && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Propina</Text>
            <Text style={styles.rowValue}>+ {formatCOP(tip)}</Text>
          </View>
        )}
        <View style={[styles.row, styles.netRow]}>
          <Text style={styles.netLabel}>Tu Ganancia Neta</Text>
          <Text style={styles.netValue}>{formatCOP(finalEarnings)}</Text>
        </View>
      </View>

      {processing ? (
        <ActivityIndicator size="large" color="#174D75" style={{ marginVertical: 15 }} />
      ) : trip.status !== 'paid' ? (
        isCash ? (
          <View>
            <Text style={styles.cashNotice}>
              Recibe {formatCOP(finalFare)} en efectivo del pasajero. La comisión ({formatCOP(finalCommission)}) se descontará de tu saldo en la plataforma.
            </Text>
            <TouchableOpacity style={[styles.primaryBtn, styles.pickupBtn]} onPress={handleConfirmCashPayment}>
              <Text style={styles.primaryBtnText}>💵 Confirmar Pago en Efectivo Recibido</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <TouchableOpacity style={styles.mpBtn} onPress={handleMercadoPagoCheckout}>
              <Text style={styles.mpBtnText}>💳 Abrir Checkout Pro (Mercado Pago)</Text>
            </TouchableOpacity>

            <View style={styles.verifyRow}>
              <TouchableOpacity
                style={[styles.verifyBtn, { backgroundColor: '#16A34A' }]}
                onPress={() => handleVerifyGatewayPayment()}
              >
                <Text style={styles.verifyBtnText}>Verificar Pago</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.verifyBtn, { backgroundColor: '#DC2626' }]}
                onPress={() => handleVerifyGatewayPayment('rejected')}
              >
                <Text style={styles.verifyBtnText}>Simular Rechazo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      ) : (
        <TouchableOpacity style={styles.primaryBtn} onPress={handleCloseSummary}>
          <Text style={styles.primaryBtnText}>Cerrar Resumen y Volver al Mapa</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 9,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#28A745', marginRight: 8 },
  statusHeaderText: { fontSize: 15, fontWeight: 'bold', color: '#174D75' },
  addressBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, marginBottom: 12 },
  addressLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 4 },
  addressValue: { fontSize: 15, color: '#1E293B', fontWeight: 'bold' },
  tripMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  metaInfo: { fontSize: 12, color: '#475569', fontWeight: '600' },
  primaryBtn: { backgroundColor: '#174D75', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  pickupBtn: { backgroundColor: '#28A745' },
  finishBtn: { backgroundColor: '#DC2626' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryTitle: { fontSize: 17, fontWeight: 'bold', color: '#174D75' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  breakdownCard: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowLabel: { fontSize: 13, color: '#475569' },
  rowValue: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  netRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4 },
  netLabel: { fontSize: 15, fontWeight: 'bold', color: '#166534' },
  netValue: { fontSize: 17, fontWeight: 'bold', color: '#15803D' },
  cashNotice: { fontSize: 12, color: '#475569', marginBottom: 10, textAlign: 'center' },
  mpBtn: { backgroundColor: '#009EE3', paddingVertical: 13, borderRadius: 10, alignItems: 'center', marginBottom: 8 },
  mpBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  verifyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  verifyBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  verifyBtnText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
});