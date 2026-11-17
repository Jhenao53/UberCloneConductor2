// Valores de referencia (en pesos colombianos - COP)
const BASE_FARE = 3500;
const PER_KM = 1200;
const PER_MIN = 250;
const MIN_FARE = 6000;
const COMMISSION_RATE = 0.20; // 20% de comisión para la plataforma

// Multiplicadores según la categoría del vehículo
const CATEGORY_MULTIPLIERS = {
  'Económico': 1.0,
  'XL': 1.4,
  'Premium': 1.8,
};

/**
 * Función pura para calcular la tarifa, comisión y ganancias de un viaje.
 * 
 * @param {Object} params - Parámetros del viaje
 * @param {number} params.distanceKm - Distancia en kilómetros
 * @param {number} params.durationMin - Duración en minutos
 * @param {string} params.category - Categoría del vehículo ('Económico', 'XL', 'Premium')
 * @param {number} [params.tip=0] - Propina (opcional)
 * @returns {Object} Desglose financiero del viaje
 */
export const calculateFare = ({ distanceKm, durationMin, category = 'Económico', tip = 0 }) => {
  // 1. Seleccionar el multiplicador correcto
  const multiplier = CATEGORY_MULTIPLIERS[category] || 1.0;

  // 2. Calcular tarifa base en bruto
  const rawFare = (BASE_FARE + (distanceKm * PER_KM) + (durationMin * PER_MIN)) * multiplier;

  // 3. Aplicar tarifa mínima (se cobra la mínima si el viaje fue muy corto)
  let fare = Math.max(MIN_FARE, rawFare);

  // 4. Redondear al múltiplo de 100 COP más cercano 
  fare = Math.round(fare / 100) * 100;

  // 5. Calcular comisión y ganancia neta
  const commission = fare * COMMISSION_RATE;
  const driverEarnings = fare - commission + tip;

  return {
    fare,
    commission,
    driverEarnings,
    commissionRate: COMMISSION_RATE // Se retorna para guardarlo en la BD
  };
};