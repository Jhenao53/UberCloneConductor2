import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useEarnings, parseTripDate, normalizeTripAmounts } from '../hooks/useEarnings';

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjFhZDc3ZjZlODdiMzQ4OTc4YWZjNzI0MDU1ZDc4OWUyIiwiaCI6Im11cm11cjY0In0=';
const PAGE_SIZE = 20;

export default function TripHistoryScreen() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queryLimit, setQueryLimit] = useState(PAGE_SIZE);

  // Estados de filtros
  const [dateFilter, setDateFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // Estados de Rango de Fechas
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Estados del Modal
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [detailRouteCoords, setDetailRouteCoords] = useState([]);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Hook 1: Consulta a Firebase (useEffect)
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'trips'),
      where('driverId', '==', 'localDriver'),
      limit(queryLimit)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((t) => t.status === 'completed' || t.status === 'paid');

        fetched.sort((a, b) => parseTripDate(b) - parseTripDate(a));
        setTrips(fetched);
        setLoading(false);
      },
      (error) => {
        console.log('Error cargando historial:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [queryLimit]);

  // Hook 2: Filtrado en memoria (useMemo)
  const filteredTrips = useMemo(() => {
    const safeTrips = Array.isArray(trips) ? trips : [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOfWeek = new Date(startOfToday);
    const day = startOfWeek.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
    const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);

    return safeTrips.filter((trip) => {
      const tripDate = parseTripDate(trip);

      let matchesDate = true;
      if (dateFilter === 'today') matchesDate = tripDate >= startOfToday;
      else if (dateFilter === 'week') matchesDate = tripDate >= startOfWeek;
      else if (dateFilter === 'month') matchesDate = tripDate >= startOfMonth;
      else if (dateFilter === 'range') matchesDate = tripDate >= rangeStart && tripDate <= rangeEnd;

      let matchesPayment = true;
      if (paymentFilter !== 'all') {
        const method = (trip.paymentMethod || 'cash').toLowerCase();
        matchesPayment = method === paymentFilter;
      }

      return matchesDate && matchesPayment;
    });
  }, [trips, dateFilter, paymentFilter, startDate, endDate]);

  // Hook 3 y 4: Cálculo de ganancias (hooks personalizados)
  const earnings = useEarnings(trips, dateFilter);
  const filteredEarnings = useEarnings(filteredTrips, dateFilter);
  
  const activeSummary =
    dateFilter === 'today'
      ? earnings.today
      : dateFilter === 'week'
      ? earnings.week
      : dateFilter === 'month'
      ? earnings.month
      : filteredEarnings.filteredSummary;

  // Hook 5: Carga de la ruta para el modal (useEffect)
  useEffect(() => {
    if (!selectedTrip) {
      setDetailRouteCoords([]);
      return;
    }

    const orig = selectedTrip.origin;
    const dest = selectedTrip.destination;

    if (!orig?.lat || !orig?.lng || !dest?.lat || !dest?.lng) {
      setDetailRouteCoords([]);
      return;
    }

    const fallbackLine = [
      { latitude: Number(orig.lat), longitude: Number(orig.lng) },
      { latitude: Number(dest.lat), longitude: Number(dest.lng) },
    ];
    setDetailRouteCoords(fallbackLine);

    const fetchDetailRoute = async () => {
      setLoadingRoute(true);
      try {
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${orig.lng},${orig.lat}&end=${dest.lng},${dest.lat}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const coords = data.features[0].geometry.coordinates.map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng,
          }));
          setDetailRouteCoords(coords);
        }
      } catch (err) {
        console.log('Usando polilínea directa en detalle:', err);
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchDetailRoute();
  }, [selectedTrip]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#174D75" />
        <Text style={styles.loadingText}>Cargando historial y ganancias...</Text>
      </View>
    );
  }

  // Utilidades de formato
  const formatCOP = (value) => '$' + Math.round(Number(value || 0)).toLocaleString('es-CO');
  const formatDateTime = (trip) => {
    const d = parseTripDate(trip);
    return `${d.toLocaleDateString('es-CO')} • ${d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const getPaymentStatusBadge = (trip) => {
    if (trip.paymentMethod === 'cash') {
      return { label: 'Efectivo', bg: '#E8F5E9', color: '#2E7D32' };
    }
    const status = (trip.paymentStatus || trip.status || '').toLowerCase();
    if (status === 'approved' || status === 'paid') {
      return { label: 'Aprobado', bg: '#E3F2FD', color: '#1565C0' };
    }
    if (status === 'rejected') {
      return { label: 'Rechazado', bg: '#FFEBEE', color: '#C62828' };
    }
    return { label: 'Pendiente', bg: '#FFF8E1', color: '#F57F17' };
  };

  const renderTripItem = ({ item }) => {
    const { fare, driverEarnings } = normalizeTripAmounts(item);
    const badge = getPaymentStatusBadge(item);

    return (
      <TouchableOpacity style={styles.tripCard} onPress={() => setSelectedTrip(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{formatDateTime(item)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          <Text style={styles.routeText} numberOfLines={1}>
            📍 {item.origin?.address || 'Origen'} → 🏁 {item.destination?.address || 'Destino'}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>{item.category || 'Económico'}</Text>
          </View>
          <View style={styles.amountsRow}>
            <Text style={styles.fareSmall}>Tarifa: {formatCOP(fare)}</Text>
            <Text style={styles.netAmount}>Ganancia: {formatCOP(driverEarnings)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* CABECERA DE GANANCIAS */}
      <View style={styles.summaryContainer}>
        <View style={styles.balanceRow}>
          <View>
            <Text style={styles.balanceLabel}>Saldo disponible en plataforma</Text>
            <Text
              style={[
                styles.balanceValue,
                { color: earnings.driverBalance < 0 ? '#FF6B6B' : '#4ADE80' },
              ]}
            >
              {formatCOP(earnings.driverBalance)}
            </Text>
          </View>
          <View style={styles.netHighlight}>
            <Text style={styles.balanceLabel}>Ganancia neta ({dateFilter.toUpperCase()})</Text>
            <Text style={styles.netHighlightValue}>{formatCOP(activeSummary?.netEarnings || 0)}</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricNumber}>{activeSummary?.count || 0}</Text>
            <Text style={styles.metricLabel}>Viajes</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricNumber}>{formatCOP(activeSummary?.totalBilled || 0)}</Text>
            <Text style={styles.metricLabel}>Facturado</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricNumber}>{formatCOP(activeSummary?.totalCommissions || 0)}</Text>
            <Text style={styles.metricLabel}>Comisión (20%)</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricNumber}>{formatCOP(activeSummary?.averagePerTrip || 0)}</Text>
            <Text style={styles.metricLabel}>Promedio</Text>
          </View>
        </View>
      </View>

      {/* FILTROS */}
      <View style={styles.filtersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'today', label: 'Hoy' },
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mes' },
            { id: 'range', label: '📅 Rango de fechas' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, dateFilter === f.id && styles.filterChipActive]}
              onPress={() => setDateFilter(f.id)}
            >
              <Text style={[styles.filterChipText, dateFilter === f.id && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {dateFilter === 'range' && (
          <View style={styles.rangePickerRow}>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
              <Text style={styles.dateButtonText}>Desde: {startDate.toLocaleDateString('es-CO')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
              <Text style={styles.dateButtonText}>Hasta: {endDate.toLocaleDateString('es-CO')}</Text>
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, selected) => {
                  setShowStartPicker(false);
                  if (selected) setStartDate(selected);
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, selected) => {
                  setShowEndPicker(false);
                  if (selected) setEndDate(selected);
                }}
              />
            )}
          </View>
        )}

        <View style={styles.paymentFilterRow}>
          {[
            { id: 'all', label: 'Todos los pagos' },
            { id: 'mercadopago', label: '💳 Mercado Pago' },
            { id: 'cash', label: '💵 Efectivo' },
          ].map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.paymentChip, paymentFilter === p.id && styles.paymentChipActive]}
              onPress={() => setPaymentFilter(p.id)}
            >
              <Text style={[styles.paymentChipText, paymentFilter === p.id && styles.paymentChipTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* LISTA */}
      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        renderItem={renderTripItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Sin viajes en este filtro</Text>
            <Text style={styles.emptySubtitle}>No se encontraron carreras que coincidan con la selección.</Text>
          </View>
        }
      />

      {/* MODAL */}
      <Modal visible={Boolean(selectedTrip)} animationType="slide" onRequestClose={() => setSelectedTrip(null)}>
        {selectedTrip && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle de la Carrera</Text>
              <TouchableOpacity onPress={() => setSelectedTrip(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Cerrar ✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.mapWrapper}>
                <MapView
                  style={styles.detailMap}
                  initialRegion={{
                    latitude: Number(selectedTrip.origin?.lat || 6.2442),
                    longitude: Number(selectedTrip.origin?.lng || -75.5812),
                    latitudeDelta: 0.04,
                    longitudeDelta: 0.04,
                  }}
                >
                  {selectedTrip.origin?.lat && (
                    <Marker coordinate={{ latitude: Number(selectedTrip.origin.lat), longitude: Number(selectedTrip.origin.lng) }} pinColor="green" />
                  )}
                  {selectedTrip.destination?.lat && (
                    <Marker coordinate={{ latitude: Number(selectedTrip.destination.lat), longitude: Number(selectedTrip.destination.lng) }} pinColor="red" />
                  )}
                  {detailRouteCoords.length > 0 && <Polyline coordinates={detailRouteCoords} strokeWidth={4} strokeColor="#174D75" />}
                </MapView>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailDate}>{formatDateTime(selectedTrip)}</Text>
                
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Recogida</Text>
                  <Text style={styles.detailValue}>📍 {selectedTrip.origin?.address || 'Origen'}</Text>
                </View>

                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Destino</Text>
                  <Text style={styles.detailValue}>🏁 {selectedTrip.destination?.address || 'Destino'}</Text>
                </View>
                
                <View style={styles.divider} />

                <Text style={styles.sectionSubtitle}>Desglose Financiero</Text>
                <View style={styles.BreakdownRow}>
                  <Text style={styles.breakdownLabel}>Tarifa cobrada</Text>
                  <Text style={styles.breakdownValue}>{formatCOP(normalizeTripAmounts(selectedTrip).fare)}</Text>
                </View>
                <View style={styles.BreakdownRow}>
                  <Text style={styles.breakdownLabel}>Comisión plataforma</Text>
                  <Text style={[styles.breakdownValue, { color: '#D32F2F' }]}>- {formatCOP(normalizeTripAmounts(selectedTrip).commission)}</Text>
                </View>
                <View style={[styles.BreakdownRow, styles.netRow]}>
                  <Text style={styles.netRowLabel}>Tu Ganancia Neta</Text>
                  <Text style={styles.netRowValue}>{formatCOP(normalizeTripAmounts(selectedTrip).driverEarnings)}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 15 },
  summaryContainer: { backgroundColor: '#174D75', padding: 16, paddingBottom: 20 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  balanceLabel: { color: '#B0C4DE', fontSize: 12 },
  balanceValue: { fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  netHighlight: { alignItems: 'flex-end' },
  netHighlightValue: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10 },
  metricBox: { alignItems: 'center', flex: 1 },
  metricNumber: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  metricLabel: { color: '#CBD5E1', fontSize: 11, marginTop: 2 },
  filtersSection: { backgroundColor: '#FFF', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  chipScroll: { flexDirection: 'row', marginBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8 },
  filterChipActive: { backgroundColor: '#174D75' },
  filterChipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  filterChipTextActive: { color: '#FFF' },
  rangePickerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dateButton: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', padding: 8, borderRadius: 8, marginHorizontal: 4, alignItems: 'center' },
  dateButtonText: { fontSize: 12, color: '#1E293B', fontWeight: '600' },
  paymentFilterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  paymentChip: { flex: 1, paddingVertical: 6, marginHorizontal: 3, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  paymentChipActive: { backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#0284C7' },
  paymentChipText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  paymentChipTextActive: { color: '#0369A1' },
  listContent: { padding: 14, paddingBottom: 30 },
  tripCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: 'bold' },
  routeContainer: { marginBottom: 10 },
  routeText: { fontSize: 14, color: '#1E293B', fontWeight: '500' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 },
  metaPill: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  metaPillText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  amountsRow: { flexDirection: 'row', alignItems: 'center' },
  fareSmall: { fontSize: 12, color: '#64748B', marginRight: 10 },
  netAmount: { fontSize: 14, fontWeight: 'bold', color: '#16A34A' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 42, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#334155', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  modalContainer: { flex: 1, backgroundColor: '#F5F7FA' },
  modalHeader: { backgroundColor: '#174D75', paddingTop: 45, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { padding: 6 },
  closeBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  modalScroll: { paddingBottom: 30 },
  mapWrapper: { height: 240, width: '100%', position: 'relative' },
  detailMap: { width: '100%', height: '100%' },
  detailCard: { backgroundColor: '#FFF', margin: 15, borderRadius: 12, padding: 16, elevation: 2 },
  detailDate: { fontSize: 13, color: '#64748B', marginBottom: 12, fontWeight: '600' },
  detailBlock: { marginBottom: 10 },
  detailLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase' },
  detailValue: { fontSize: 14, color: '#1E293B', fontWeight: '500', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 15 },
  sectionSubtitle: { fontSize: 15, fontWeight: 'bold', color: '#174D75', marginBottom: 10 },
  BreakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakdownLabel: { fontSize: 14, color: '#475569' },
  breakdownValue: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  netRow: { backgroundColor: '#F0FDF4', padding: 10, borderRadius: 8, marginVertical: 6 },
  netRowLabel: { fontSize: 15, fontWeight: 'bold', color: '#166534' },
  netRowValue: { fontSize: 17, fontWeight: 'bold', color: '#15803D' },
});