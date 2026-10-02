const express = require('express');
const router = express.Router();
const { obtenerEnlaceCurso, guardarEnlaceCurso } = require('../services/db.service');
const { enviarEmailInvitacion } = require('../services/email.service');
const { crearGrupo } = require('../services/whatsapp.service');
const { requireAdminAuth } = require('../middleware/adminAuth');

function normalizarTexto(value, maxLength = 120) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function esEmailValido(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

router.post('/inscribir-alumno', async (req, res) => {
  try {
    const email = normalizarTexto(String(req.body && req.body.email ? req.body.email : '')).toLowerCase();
    const nombreCurso = normalizarTexto(String(req.body && req.body.nombreCurso ? req.body.nombreCurso : ''), 80);

    if (!esEmailValido(email) || !nombreCurso) {
      return res.status(400).json({ error: 'Datos invalidos. Revisa el email y el nombre del curso.' });
    }

    console.log('-> Nueva matricula recibida: ' + email + ' en ' + nombreCurso);

    const enlace = await obtenerEnlaceCurso(nombreCurso);

    if (enlace) {
      await enviarEmailInvitacion(email, enlace, nombreCurso);
      return res.json({ status: 'Inscripcion procesada. Email enviado con el enlace del grupo.' });
    }

    console.log('-> Aviso: No hay grupo creado todavia para ' + nombreCurso);
    return res.status(404).json({ status: 'Matricula procesada, pero aun no hay enlace de WhatsApp guardado por el monitor.' });
  } catch (error) {
    console.error('Error en la inscripcion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/forzar-pin', requireAdminAuth, async (req, res) => {
  try {
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_TOKEN;
    const pin = process.env.PIN_ADMIN || '751309';

    if (!phoneNumberId || !accessToken) {
      return res.status(500).json({ error: 'Faltan WHATSAPP_TOKEN o PHONE_NUMBER_ID en el entorno.' });
    }

    const response = await fetch('https://graph.facebook.com/v19.0/' + phoneNumberId + '/register', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin: pin
      })
    });

    const data = await response.json();
    return res.json({
      status: response.ok ? 'PIN registrado con exito por API!' : 'Error al registrar el PIN en Meta',
      respuesta_meta: data
    });
  } catch (error) {
    console.error('Error al forzar PIN:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/crear-grupo', requireAdminAuth, async (req, res) => {
  try {
    const nombreCurso = normalizarTexto(String(req.body && req.body.nombreCurso ? req.body.nombreCurso : ''), 80);

    if (!nombreCurso) {
      return res.status(400).json({ error: 'Falta el nombreCurso' });
    }

    const nombreCursoCompleto = 'LD - ' + nombreCurso;
    console.log('-> Solicitando a Meta la creacion del grupo: ' + nombreCursoCompleto);

    const metaResponse = await crearGrupo(nombreCursoCompleto);

    if (metaResponse && metaResponse.invite_link) {
      await guardarEnlaceCurso(nombreCurso, metaResponse.invite_link);

      return res.json({
        status: 'Grupo creado con exito y enlazado al curso.',
        id_grupo: metaResponse.id,
        enlace: metaResponse.invite_link
      });
    }

    return res.status(500).json({ error: 'Meta rechazo la creacion (revisa si el numero tiene los permisos OBA).' });
  } catch (error) {
    console.error('Error interno al crear grupo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
