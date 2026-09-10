const express = require('express');
const router = express.Router();
const { colaInscripciones } = require('../utils/queue');
const { crearGrupoCurso } = require('../services/whatsapp.service');
const { enviarEmailInvitacion } = require('../services/email.service');

router.post('/inscribir-alumno', async (req, res) => {
  colaInscripciones.set(req.body.nombreCurso, { emailAlumno: req.body.email });
  await crearGrupoCurso(req.body.nombreCurso);
  res.json({ status: "Procesando inscripción..." });
});

router.get('/mock-webhook', async (req, res) => {
  const nombreCurso = "Pádel L-X";
  colaInscripciones.set(nombreCurso, { emailAlumno: "diallue@unirioja.es" });
  
  const mockPayload = {
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ field: 'group_lifecycle_update', value: { action: 'created', subject: `Logroño Deporte - ${nombreCurso}`, invite_link: 'https://chat.whatsapp.com/FALSO' } }] }]
  };
  
  await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mockPayload) });
  res.json({ status: "Simulación ejecutada" });
});

// Ruta temporal para probar la creación de grupos reales en Meta
router.get('/test-grupo', async (req, res) => {
  console.log("Enviando petición a Meta para crear el grupo real...");
  
  const resultado = await crearGrupoCurso("Pádel L-X Test API");
  
  res.json({ 
    status: "Petición enviada a la API de Meta", 
    aviso: "Revisa la pestaña Logs en Render.",
    respuesta_meta: resultado 
  });
});

module.exports = router;

// Ruta temporal para forzar el PIN de 2FA mediante la API de Meta
router.get('/forzar-pin', async (req, res) => {
  try {
    const phoneNumberId = '1366063996580453';
    const accessToken = process.env.WHATSAPP_TOKEN;
    const pin = '751309';

    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin: pin
      })
    });

    const data = await response.json();
    res.json({
      status: response.ok ? "¡PIN registrado con éxito por API!" : "Error al registrar el PIN en Meta",
      respuesta_meta: data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
