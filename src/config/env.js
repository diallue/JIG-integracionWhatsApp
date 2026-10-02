const requiredEnv = ['VERIFY_TOKEN', 'WHATSAPP_TOKEN', 'PHONE_NUMBER_ID'];

function validateRequiredEnv() {
  const missing = requiredEnv.filter((key) => {
    const value = process.env[key];
    return !value || !String(value).trim();
  });

  if (missing.length > 0) {
    console.warn(`[security] Faltan variables de entorno: ${missing.join(', ')}. Algunas funciones del bot no funcionarán hasta configurarlas.`);
  }

  if (!process.env.ADMIN_API_TOKEN && !process.env.PIN_ADMIN) {
    console.warn('[security] No hay ADMIN_API_TOKEN ni PIN_ADMIN definidos. Las rutas administrativas quedan protegidas y deben configurarse antes de producción.');
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('[security] RESEND_API_KEY no está definido. Los emails no se enviarán hasta configurarlo.');
  }
}

module.exports = { validateRequiredEnv };
