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
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
      const field = body.entry?.[0]?.changes?.[0]?.field;
      const value = body.entry?.[0]?.changes?.[0]?.value;

      if (field === 'messages' && value?.messages?.[0]?.type === 'text') {
        const remitente = value.messages[0].from;
        const texto = value.messages[0].text.body.toLowerCase();
        
        console.log(`Mensaje recibido de ${remitente}: "${texto}"`);
        
        if (/\b(horario|horarios|clases|hora|horas|clase|turno)\b/.test(texto)) {
          console.log("-> Palabra clave detectada. Enviando plantilla a Meta...");
          
          enviarPlantillaHorarios(remitente)
            .then(() => console.log("-> ¡Plantilla enviada con éxito!"))
            .catch(error => {
              console.error("-> ERROR AL ENVIAR LA PLANTILLA:", error.response?.data || error.message);
            });
        }
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
  } catch (error) { 
    console.error("Error general en el webhook:", error); 
  }
});
module.exports = router;
