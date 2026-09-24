const express = require('express');
const router = express.Router();
const { obtenerEnlaceCurso } = require('../services/db.service');
const { enviarEmailInvitacion } = require('../services/email.service');

router.post('/inscribir-alumno', async (req, res) => {
  try {
    const { email, nombreCurso } = req.body;

    if (!email || !nombreCurso) {
      return res.status(400).json({ error: "Faltan datos (email o nombreCurso)" });
    }

    console.log(`-> Nueva matrícula recibida: ${email} en ${nombreCurso}`);

    const enlace = await obtenerEnlaceCurso(nombreCurso);

    if (enlace) {
      await enviarEmailInvitacion(email, enlace, nombreCurso);
      res.json({ status: "Inscripción procesada. Email enviado con el enlace del grupo." });
    } else {
      console.log(`-> Aviso: No hay grupo creado todavía para ${nombreCurso}`);
      res.status(404).json({ status: "Matrícula procesada, pero aún no hay enlace de WhatsApp guardado por el monitor." });
    }
  } catch (error) {
    console.error("Error en la inscripción:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get('/forzar-pin', async (req, res) => {
  try {
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
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

module.exports = router;