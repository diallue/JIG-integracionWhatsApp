const express = require('express');
const router = express.Router();
const { guardarEnlaceCurso, obtenerEnlaceCurso } = require('../services/db.service');
const { enviarMensajeTexto, enviarPlantillaHorarios, enviarEnlaceGrupo } = require('../services/whatsapp.service');

const PIN_ADMIN = process.env.PIN_ADMIN || "LD2026"; 

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
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const field = changes?.field;

      if (value?.statuses) {
        const estado = value.statuses[0];
        if (estado.errors) console.error("-> FALLO ENTREGA:", JSON.stringify(estado.errors));
        return;
      }
      
      if (field === 'messages' && value?.messages?.[0]?.type === 'text') {
        const remitente = value.messages[0].from;
        const textoOriginal = value.messages[0].text.body; 
        const textoMinusculas = textoOriginal.toLowerCase();
        
        console.log(`[MENSAJE RECIBIDO] De ${remitente}: "${textoOriginal}"`);

        const regexAdmin = /^!nuevo\s+(\S+)\s+(.+?)\s+(https:\/\/chat\.whatsapp\.com\/\S+)$/i;
        const matchAdmin = textoOriginal.match(regexAdmin);

        if (matchAdmin) {
          const pinRecibido = matchAdmin[1];
          const nombreCurso = matchAdmin[2];
          const enlace = matchAdmin[3];

          if (pinRecibido === PIN_ADMIN) {
            await guardarEnlaceCurso(nombreCurso, enlace);
            await enviarMensajeTexto(remitente, `¡Éxito! Enlace guardado correctamente en la base de datos para el curso: *${nombreCurso}*`);
          } else {
            await enviarMensajeTexto(remitente, `Acceso denegado: PIN de seguridad incorrecto.`);
          }
          return; 
        }

        const regexUsuario = /^quiero unirme al grupo de (.+)$/i;
        const matchUsuario = textoMinusculas.match(regexUsuario);

        if (matchUsuario) {
          const nombreCursoSolicitado = matchUsuario[1];
          console.log(`-> Buscando enlace para: ${nombreCursoSolicitado}`);
          
          const enlaceEncontrado = await obtenerEnlaceCurso(nombreCursoSolicitado);

          if (enlaceEncontrado) {
            await enviarEnlaceGrupo(remitente, nombreCursoSolicitado, enlaceEncontrado);
            console.log("-> Enlace entregado al alumno con éxito.");
          } else {
            await enviarMensajeTexto(remitente, `Lo siento, todavía no tengo registrado un grupo para el curso de *${nombreCursoSolicitado}*. Por favor, consulta con Logroño Deporte o tu monitor.`);
          }
          return;
        }

        if (/\b(horario|horarios|clases|clase|turno)\b/.test(textoMinusculas)) {
          await enviarPlantillaHorarios(remitente);
          return;
        }
      } 
    }
  } catch (error) { 
    console.error("Error general en el webhook:", error); 
  }
});

module.exports = router;