require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const PUBLIC_BACKEND_URL = process.env.PUBLIC_BACKEND_URL || `http://localhost:${PORT}`;

// Almacenamiento en memoria del estado de pagos para sincronización rápida en pruebas locales
const paymentStore = {};

/**
 * 1. Crear preferencia de pago en Mercado Pago Checkout Pro
 * Recibe: { tripId, amount, description }
 */
app.post('/api/create-preference', async (req, res) => {
  try {
    const { tripId, amount, description } = req.body;

    if (!tripId || !amount) {
      return res.status(400).json({ error: 'tripId y amount son obligatorios' });
    }

    const numericAmount = Math.round(Number(amount));

    // Si existe un token válido de prueba de Mercado Pago, creamos la preferencia real
    if (MP_ACCESS_TOKEN && MP_ACCESS_TOKEN.startsWith('TEST-')) {
      const preferencePayload = {
        items: [
          {
            id: tripId,
            title: description || `Viaje UberClone #${tripId}`,
            quantity: 1,
            currency_id: 'COP',
            unit_price: numericAmount,
          },
        ],
        external_reference: tripId,
        back_urls: {
          success: `${PUBLIC_BACKEND_URL}/api/payment-return?tripId=${tripId}&status=approved`,
          failure: `${PUBLIC_BACKEND_URL}/api/payment-return?tripId=${tripId}&status=rejected`,
          pending: `${PUBLIC_BACKEND_URL}/api/payment-return?tripId=${tripId}&status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${PUBLIC_BACKEND_URL}/api/webhook`,
      };

      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(preferencePayload),
      });

      const mpData = await mpResponse.json();

      if (mpResponse.ok && (mpData.sandbox_init_point || mpData.init_point)) {
        paymentStore[tripId] = {
          paymentStatus: 'pending',
          paymentId: mpData.id,
        };

        return res.json({
          preferenceId: mpData.id,
          checkoutUrl: mpData.sandbox_init_point || mpData.init_point,
          mode: 'mercadopago_sandbox',
        });
      }
    }

    const simulatedId = `MP-TEST-${Date.now()}`;
    paymentStore[tripId] = {
      paymentStatus: 'pending',
      paymentId: simulatedId,
    };

    return res.json({
      preferenceId: simulatedId,
      checkoutUrl: `${PUBLIC_BACKEND_URL}/api/mock-checkout?tripId=${tripId}&amount=${numericAmount}`,
      mode: 'local_sandbox',
    });
  } catch (error) {
    console.error('Error al crear preferencia:', error);
    return res.status(500).json({ error: 'Error interno creando preferencia de pago' });
  }
});

/**
 * 2. Pantalla de Checkout de prueba local (permite probar Tarjeta Aprobada / Rechazada en el navegador)
 */
app.get('/api/mock-checkout', (req, res) => {
  const { tripId, amount } = req.query;
  const formatted = Number(amount || 0).toLocaleString('es-CO');

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Mercado Pago Sandbox - Checkout Pro</title>
      <style>
        body { font-family: sans-serif; background: #f5f7fa; padding: 20px; text-align: center; }
        .card { background: #fff; max-width: 400px; margin: 30px auto; padding: 24px; border-radius: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        h2 { color: #009ee3; margin-top: 0; }
        .amount { font-size: 28px; font-weight: bold; color: #1e293b; margin: 16px 0; }
        .btn { display: block; width: 100%; padding: 14px; margin-top: 12px; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; text-decoration: none; box-sizing: border-box; }
        .approve { background: #00a650; color: white; }
        .pending { background: #f59e0b; color: white; }
        .reject { background: #ef4444; color: white; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Mercado Pago Checkout Pro (Modo Prueba)</h2>
        <p>Viaje ID: <strong>${tripId}</strong></p>
        <div class="amount">$${formatted} COP</div>
        <p>Selecciona el resultado de la tarjeta de prueba:</p>
        <a class="btn approve" href="/api/payment-return?tripId=${tripId}&status=approved&payment_id=MP-${Date.now()}">Aprobar Pago (Tarjeta APRO)</a>
        <a class="btn pending" href="/api/payment-return?tripId=${tripId}&status=pending&payment_id=MP-${Date.now()}">Dejar Pendiente (Tarjeta CONT)</a>
        <a class="btn reject" href="/api/payment-return?tripId=${tripId}&status=rejected&payment_id=MP-${Date.now()}">Rechazar Pago (Tarjeta FUND)</a>
      </div>
    </body>
    </html>
  `);
});

/**
 * 3. URL de retorno (Back URL) cuando la pasarela finaliza el proceso
 */
app.get('/api/payment-return', (req, res) => {
  const { tripId, status, payment_id } = req.query;
  const finalPaymentId = payment_id || `MP-${Date.now()}`;

  if (tripId) {
    paymentStore[tripId] = {
      paymentStatus: status || 'approved',
      paymentId: finalPaymentId,
      updatedAt: new Date().toISOString(),
    };
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Resultado del Pago</title>
      <style>
        body { font-family: sans-serif; background: #174D75; color: white; display: flex; align-items: center; justify-content: center; height: 90vh; text-align: center; padding: 20px; }
        .box { background: white; color: #1e293b; padding: 28px; border-radius: 16px; max-width: 360px; }
        h3 { margin-top: 0; color: #174D75; }
      </style>
    </head>
    <body>
      <div class="box">
        <h3>Estado del pago: ${(status || 'approved').toUpperCase()}</h3>
        <p>ID de transacción: <strong>${finalPaymentId}</strong></p>
        <p>Ya puedes cerrar esta ventana para volver a la app del conductor.</p>
      </div>
    </body>
    </html>
  `);
});

/**
 * 4. Webhook de notificación de Mercado Pago
 */
app.post('/api/webhook', (req, res) => {
  const { data, type, external_reference } = req.body || {};
  if (external_reference) {
    paymentStore[external_reference] = {
      paymentStatus: 'approved',
      paymentId: data?.id || `MP-WH-${Date.now()}`,
      type,
    };
  }
  res.sendStatus(200);
});

/**
 * 5. Consulta del estado del pago por viaje
 */
app.get('/api/payment-status/:tripId', (req, res) => {
  const { tripId } = req.params;
  const record = paymentStore[tripId] || { paymentStatus: 'pending', paymentId: null };
  res.json(record);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de pagos ejecutándose en ${PUBLIC_BACKEND_URL}`);
});