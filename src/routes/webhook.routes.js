const express = require('express');
const router = express.Router();
const { colaInscripciones } = require('../utils/queue');
const { enviarPlantillaHorarios, crearGrupoCurso } = require('../services/whatsapp.service');
const { enviarEmailInvitacion } = require('../services/email.service');

router.get('/', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

router.post('/', async (req, res) => {
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

        if (texto.includes("unirme a pilates")) {
          console.log("-> Solicitud de grupo detectada. Enviando enlace...");
          
          const nombreCurso = "Pilates Avanzado";
          const enlaceReal = "https://chat.whatsapp.com/Hzvdx52ssP86VQUJcPIIT7?s=cl&p=a&mlu=4&ilr=4";
          
          enviarEnlaceGrupo(remitente, nombreCurso, enlaceReal)
            .then(() => console.log("[ENLACE ENVIADO CON ÉXITO]"))
            .catch(error => console.error("-> ERROR AL ENVIAR ENLACE:", error.message));
        }

        if (texto.includes("grupo")) {
          console.log("-> Creando grupo de curso...");
          const resultadoGrupo = await crearGrupoCurso("Pilates Avanzado");
          console.log("[GRUPO CREADO]:", resultadoGrupo);
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
