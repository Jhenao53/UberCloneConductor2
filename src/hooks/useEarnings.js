import { useMemo } from 'react';
import { calculateFare } from '../config/pricing';

// Convierte cualquier formato de fecha de Firestore o JS a objeto Date
export const parseTripDate = (trip) => {
  const raw = trip?.completedAt || trip?.createdAt;
  if (!raw) return new Date();
  
  if (raw && typeof raw.toDate === 'function') {
    return raw.toDate();
  }
  
  if (raw && typeof raw.seconds === 'number') {
    return new Date(raw.seconds * 1000);
  }
  
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// Normaliza los montos del viaje
export const normalizeTripAmounts = (trip) => {
  const tip = Number(trip?.tip || 0);
  if (trip?.fare && trip?.driverEarnings !== undefined) {
    return {
      fare: Number(trip.fare),
      commission: Number(trip.commission || Math.round(trip.fare * (trip.commissionRate || 0.2))),
      tip,
      driverEarnings: Number(trip.driverEarnings),
    };
  }

  return {
    ...calculateFare({
      distanceKm: Number(trip?.distanceKm || 0),
      durationMin: Number(trip?.durationMin || 0),
      category: trip?.category || 'Económico',
      tip,
    }),
    tip,
  };
};

export function useEarnings(tripsList, periodFilter = 'all') {
  // Garantizamos que trips siempre sea un arreglo válido, incluso si llega como undefined
  const trips = Array.isArray(tripsList) ? tripsList : [];

  return useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOfWeek = new Date(startOfToday);
    const day = startOfWeek.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const computeMetrics = (list) => {
      let totalBilled = 0;
      let totalCommissions = 0;
      let totalTips = 0;
      let netEarnings = 0;
      
      const safeList = Array.isArray(list) ? list : [];

      safeList.forEach((trip) => {
        const { fare, commission, tip, driverEarnings } = normalizeTripAmounts(trip);
        totalBilled += fare;
        totalCommissions += commission;
        totalTips += tip;
        netEarnings += driverEarnings;
      });

      const count = safeList.length;
      const averagePerTrip = count > 0 ? Math.round(netEarnings / count) : 0;

      return {
        count,
        totalBilled,
        totalCommissions,
        totalTips,
        netEarnings,
        averagePerTrip,
      };
    };

    let driverBalance = 0;
    trips.forEach((trip) => {
      const { commission, driverEarnings } = normalizeTripAmounts(trip);
      if (trip.paymentMethod === 'cash') {
        driverBalance -= commission;
      } else {
        driverBalance += driverEarnings;
      }
    });

    const todayTrips = trips.filter((t) => parseTripDate(t) >= startOfToday);
    const weekTrips = trips.filter((t) => parseTripDate(t) >= startOfWeek);
    const monthTrips = trips.filter((t) => parseTripDate(t) >= startOfMonth);

    return {
      today: computeMetrics(todayTrips),
      week: computeMetrics(weekTrips),
      month: computeMetrics(monthTrips),
      filteredSummary: computeMetrics(trips),
      driverBalance,
    };
  }, [trips, periodFilter]);
}