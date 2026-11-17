# UberClone - Aplicación para Conductores 🚗

Esta es la aplicación móvil para conductores del proyecto UberClone, desarrollada con React Native y Expo. Permite a los conductores recibir solicitudes de viaje en tiempo real, trazar rutas, calcular tarifas, procesar pagos con Mercado Pago y revisar su historial financiero.

## 🌟 Características Principales

*   **Geolocalización en Tiempo Real:** Seguimiento de la ubicación del conductor mediante `expo-location`.
*   **Trazado de Rutas (Gratis):** Integración con la API de OpenRouteService (ORS) y `<Polyline>` nativo, eliminando la dependencia de facturación de Google Maps.
*   **Gestión de Viajes:** Flujo completo desde la solicitud (`requested`) hasta la finalización (`completed`/`paid`).
*   **Notificaciones Locales:** Alertas sonoras y visuales cuando entra un nuevo viaje.
*   **Cálculo de Tarifas y Ganancias:** Algoritmo de precios basado en tiempo y distancia, con cálculo automático de la comisión de la plataforma (20%).
*   **Pasarela de Pagos:** Integración con **Mercado Pago Checkout Pro** mediante un servidor backend en Node.js.
*   **Historial y Filtros:** Pantalla de historial de carreras con filtros combinados (Hoy, Semana, Mes, Rango de Fechas y Método de pago) procesados en memoria.

## 🛠 Tecnologías Utilizadas

*   **Frontend:** React Native, Expo, React Navigation, React Native Maps.
*   **Backend/Pagos:** Node.js, Express, MercadoPago SDK.
*   **Base de Datos:** Firebase Firestore (Tiempo real).
*   **Servicios Externos:** OpenRouteService API (Rutas).

## 📋 Requisitos Previos

1.  [Node.js](https://nodejs.org/) instalado en tu computadora.
2.  La aplicación [Expo Go](https://expo.dev/client) instalada en tu dispositivo móvil físico.
3.  Una cuenta en [OpenRouteService](https://openrouteservice.org/) para obtener el Token de rutas.
4.  Una cuenta de desarrollador en [Mercado Pago](https://developers.mercadopago.com/) para el Access Token de prueba.

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone <URL_DE_TU_REPOSITORIO>
cd UberCloneConductor
npm install
```

### 2. Configurar Variables de Entorno (Backend)

Navega a la carpeta del backend, instala sus dependencias y crea el archivo `.env`:

```bash
cd backend
npm install
```

Crea un archivo `.env` en la raíz de la carpeta `backend` con la siguiente estructura (asegúrate de usar tu IP local real, no `localhost`):

```env
PORT=3000
MP_ACCESS_TOKEN=TEST-0000000000000000-000000-00000000000000000000000000000000-000000000
PUBLIC_BACKEND_URL=http://192.168.X.X:3000
```

### 3. Configurar Frontend

Abre `src/components/ActiveTripPanel.js` y asegúrate de que la constante `BACKEND_URL` apunte a la misma IP configurada en tu backend:

```javascript
const BACKEND_URL = 'http://192.168.X.X:3000';
```

## ▶️ Ejecución del Proyecto

Para probar el proyecto en un entorno local, debes ejecutar ambos servidores (Backend y Frontend) de manera simultánea en la misma red Wi-Fi.

**Terminal 1: Iniciar el servidor de pagos (Backend)**
```bash
cd backend
node index.js
```

**Terminal 2: Iniciar la aplicación móvil (Frontend)**
```bash
# En la raíz del proyecto
npx expo start -c
```
Escanea el código QR con tu aplicación Expo Go (Android) o la cámara (iOS).

## ⚠️ Notas Importantes para Evaluación
*   **Índices de Firebase:** La aplicación realiza los filtros de estado de los viajes activos directamente en la memoria del dispositivo para evitar errores de *Composite Index* en evaluaciones rápidas de Firestore.
*   **Reglas de Hooks:** El componente de historial está refactorizado para garantizar que los retornos tempranos condicionales (ej. pantallas de carga) no rompan el ciclo de vida de los hooks de React.