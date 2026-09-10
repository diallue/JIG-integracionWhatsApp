const express = require('express');
const router = express.Router();
const { colaInscripciones } = require('../utils/queue');
const { enviarPlantillaHorarios } = require('../services/whatsapp.service');
const { enviarEmailInvitacion } = require('../services/email.service');

router.get('/', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

router.post('/', (req, res) => {
  res.status(200).end();
  try {
    console.log("¡Evento recibido de Meta!:", JSON.stringify(req.body, null, 2));
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      const field = body.entry?.[0]?.changes?.[0]?.field;
      const value = body.entry?.[0]?.changes?.[0]?.value;

      if (field === 'messages' && value?.messages?.[0]?.type === 'text') {
        const texto = value.messages[0].text.body.toLowerCase();
        if (/\b(horario|clase|turno)\b/.test(texto)) enviarPlantillaHorarios(value.messages[0].from);
      } 
      else if (field === 'group_lifecycle_update' && value?.invite_link) {
        const nombreCurso = value.subject.replace("Logroño Deporte - ", "");
        const datos = colaInscripciones.get(nombreCurso);
        if (datos) {
          enviarEmailInvitacion(datos.emailAlumno, value.invite_link, nombreCurso);
          colaInscripciones.delete(nombreCurso);
        }
      }
    }
  } catch (error) { console.error("Error webhook:", error); }
});
module.exports = router;
