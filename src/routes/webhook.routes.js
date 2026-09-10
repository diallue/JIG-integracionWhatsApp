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

      if (value?.statuses) {
        const estado = value.statuses[0];
        console.log(`[ESTADO] Mensaje: ${estado.status} (Teléfono: ${estado.recipient_id})`);
        
        if (estado.errors) {
          console.error("-> MOTIVO DEL FALLO DE ENTREGA:", JSON.stringify(estado.errors, null, 2));
        }
      }
      
      else if (field === 'messages' && value?.messages?.[0]?.type === 'text') {
        const remitente = value.messages[0].from;
        const texto = value.messages[0].text.body.toLowerCase();
        
        console.log(`Mensaje recibido de ${remitente}: "${texto}"`);
        
        if (/\b(horario|clase|turno)\b/.test(texto)) {
          console.log("-> Palabra clave detectada. Enviando plantilla a Meta...");
          
          enviarPlantillaHorarios(remitente)
            .then(() => console.log("-> Petición de plantilla aceptada por Meta (esperando estado de entrega...)."))
            .catch(error => console.error("-> ERROR HTTP:", error.response?.data || error.message));
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
