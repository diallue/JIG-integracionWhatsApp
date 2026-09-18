const express = require('express');
const router = express.Router();

const { 
  guardarEnlaceCurso, 
  obtenerEnlaceCurso,
  setEstadoUsuario,
  getEstadoUsuario,
  clearEstadoUsuario,
  guardarDatoTemporal,
  getDatosTemporales
} = require('../services/db.service');

const { enviarMensajeTexto, enviarPlantillaHorarios, enviarEnlaceGrupo } = require('../services/whatsapp.service');
const { enviarReservaAPI } = require('../services/reservas.service');

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
        const nombrePerfil = value.contacts?.[0]?.profile?.name || "Cliente";
        const textoOriginal = value.messages[0].text.body; 
        const textoMinusculas = textoOriginal.toLowerCase();
        
        console.log(`[MENSAJE RECIBIDO] De ${remitente}: "${textoOriginal}"`);

        const estadoActual = await getEstadoUsuario(remitente);

        if (estadoActual) {
          if (estadoActual === 'ESPERANDO_FECHA') {
            await guardarDatoTemporal(remitente, 'fecha', textoOriginal);
            await setEstadoUsuario(remitente, 'ESPERANDO_HORA');
            await enviarMensajeTexto(remitente, `📅 ¡Anotado! Fecha: ${textoOriginal}.\n\n¿A qué hora te gustaría venir? (Ej: 14:30 o 21:00)`);
            return;
          }
          
          if (estadoActual === 'ESPERANDO_HORA') {
            await guardarDatoTemporal(remitente, 'hora', textoOriginal);
            await setEstadoUsuario(remitente, 'ESPERANDO_PLAZAS');
            await enviarMensajeTexto(remitente, `⏰ Perfecto, a las ${textoOriginal}.\n\n¿Cuántas personas vais a ser en total? (Dime un número, ej: 4)`);
            return;
          }

          if (estadoActual === 'ESPERANDO_PLAZAS') {
            await enviarMensajeTexto(remitente, "⏳ Comprobando disponibilidad y procesando tu reserva...");
            
            const datos = await getDatosTemporales(remitente);
            datos.plazas = textoOriginal;
            datos.nombre = nombrePerfil; 
            
            const localizador = await enviarReservaAPI(remitente, datos);
            
            if (localizador) {
              await enviarMensajeTexto(remitente, `✅ ¡Reserva confirmada con éxito!\n\n🆔 Localizador: *${localizador}*\n📅 Fecha: ${datos.fecha}\n⏰ Hora: ${datos.hora}\n👥 Plazas: ${datos.plazas}\n\nTe esperamos.`);
            } else {
              await enviarMensajeTexto(remitente, "❌ Lo siento, no hay disponibilidad para esa fecha/hora o los datos son incorrectos. Por favor, inténtalo de nuevo más tarde.");
            }
            
            // Limpiamos la memoria para que el usuario pueda usar otros comandos
            await clearEstadoUsuario(remitente);
            return;
          }
        }

        if (/\b(reservar|reserva)\b/.test(textoMinusculas)) {
          await setEstadoUsuario(remitente, 'ESPERANDO_FECHA');
          await enviarMensajeTexto(remitente, "¡Hola! Estaré encantado de gestionar tu reserva paso a paso. 🍷\n\n📅 ¿Para qué fecha la necesitas? (Dime el día, ej: 25/10/2026)");
          return;
        }

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