const express = require('express');
const router = express.Router();

const { 
  guardarEnlaceCurso, 
  obtenerEnlaceCurso,
  setEstadoUsuario,
  getEstadoUsuario,
  clearEstadoUsuario,
  guardarDatoTemporal,
  getDatosTemporales,
  validarAlumno
} = require('../services/db.service');

const { enviarMensajeTexto, enviarPlantillaHorarios, enviarEnlaceGrupo, enviarMenuPrincipal, enviarBotonesHora, suscribirAlumno, obtenerSuscriptores } = require('../services/whatsapp.service');
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
      
      if (field === 'messages' && value?.messages?.[0]) {
        const mensajeEntrante = value.messages[0];
        const remitente = mensajeEntrante.from;
        const nombrePerfil = value.contacts?.[0]?.profile?.name || "Cliente";
        
        let textoOriginal = "";
        let textoMinusculas = "";

        if (mensajeEntrante.type === 'text') {
            textoOriginal = mensajeEntrante.text.body; 
            textoMinusculas = textoOriginal.toLowerCase();
        } 
        else if (mensajeEntrante.type === 'interactive') {
            textoOriginal = mensajeEntrante.interactive.button_reply.id; 
            textoMinusculas = textoOriginal.toLowerCase();
        } else {
            return;
        }
        
        console.log(`[MENSAJE RECIBIDO] De ${remitente}: "${textoOriginal}"`);

        const estadoActual = await getEstadoUsuario(remitente);

        if (estadoActual) {
          if (textoMinusculas === 'cancelar') {
             await clearEstadoUsuario(remitente);
             await enviarMensajeTexto(remitente, "🚫 Operación cancelada. ¿En qué más puedo ayudarte?");
             return;
          }

          if (estadoActual === 'ESPERANDO_DNI') {
             const identificador = textoOriginal.trim();
             const esValido = await validarAlumno(identificador);

             if (esValido) {
                 const datos = await getDatosTemporales(remitente);
                 const enlace = await obtenerEnlaceCurso(datos.curso_solicitado);
                 
                 await suscribirAlumno(datos.curso_solicitado, remitente); 
                 
                 await enviarEnlaceGrupo(remitente, datos.curso_solicitado, enlace);
                 await clearEstadoUsuario(remitente);
             } else {
                 await enviarMensajeTexto(remitente, "❌ Lo siento, no encuentro ese DNI o número de abonado en la lista de inscritos. Revísalo y vuelve a escribirlo, o escribe *cancelar* para salir.");
             }
             return;
          }

          if (estadoActual === 'ESPERANDO_FECHA') {
            await guardarDatoTemporal(remitente, 'fecha', textoOriginal);
            await setEstadoUsuario(remitente, 'ESPERANDO_HORA');
            await enviarBotonesHora(remitente, textoOriginal);
            return;
          }
          
          if (estadoActual === 'ESPERANDO_HORA') {
            await guardarDatoTemporal(remitente, 'hora', textoOriginal);
            await setEstadoUsuario(remitente, 'ESPERANDO_PLAZAS');
            await enviarMensajeTexto(remitente, `⏰ Perfecto, a las ${textoOriginal}.\n\n¿Cuántas personas vais a ser en total? (Dime un número, ej: 4)\n\n_(💡 Escribe *cancelar* en cualquier momento para salir)_`);
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
            
            await clearEstadoUsuario(remitente);
            return;
          }
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

        const regexAviso = /^!aviso\s+(\S+)\s+"([^"]+)"\s+(.+)$/i;
        const matchAviso = textoOriginal.match(regexAviso);

        if (matchAviso) {
          const pinRecibido = matchAviso[1];
          const nombreCurso = matchAviso[2];
          const mensajeAviso = matchAviso[3];

          if (pinRecibido === PIN_ADMIN) {
            const suscriptores = await obtenerSuscriptores(nombreCurso);
            
            if (suscriptores.length > 0) {
              await enviarMensajeTexto(remitente, `⏳ Enviando aviso a ${suscriptores.length} alumnos de *${nombreCurso}*...`);
              
              let enviados = 0;
              for (const telefonoAlumno of suscriptores) {
                 await enviarMensajeTexto(telefonoAlumno, `⚠️ *AVISO DE LOGROÑO DEPORTE*\n📍 Curso: ${nombreCurso}\n\n${mensajeAviso}`);
                 enviados++;
              }
              await enviarMensajeTexto(remitente, `✅ ¡Aviso enviado con éxito a ${enviados} alumnos!`);
            } else {
              await enviarMensajeTexto(remitente, `❌ No hay ningún alumno validado en el curso de *${nombreCurso}*.`);
            }
          } else {
            await enviarMensajeTexto(remitente, `Acceso denegado: PIN de seguridad incorrecto.`);
          }
          return;
        }

        const regexUsuario = /^quiero unirme al grupo de (.+)$/i;
        const matchUsuario = textoMinusculas.match(regexUsuario);

        if (matchUsuario) {
          const nombreCursoSolicitado = matchUsuario[1];
          const enlaceEncontrado = await obtenerEnlaceCurso(nombreCursoSolicitado);

          if (enlaceEncontrado) {
            await guardarDatoTemporal(remitente, 'curso_solicitado', nombreCursoSolicitado);
            await setEstadoUsuario(remitente, 'ESPERANDO_DNI');
            await enviarMensajeTexto(remitente, `Tengo el enlace para el grupo de *${nombreCursoSolicitado}*.\n\n🔒 Por seguridad, indícame primero tu *DNI* o tu *Número de Abonado* para verificar tu inscripción.\n\n_(💡 Escribe *cancelar* en cualquier momento para salir)_`);
          } else {
            await enviarMensajeTexto(remitente, `Lo siento, todavía no tengo registrado un grupo para el curso de *${nombreCursoSolicitado}*. Por favor, consulta con Logroño Deporte o tu monitor.`);
          }
          return;
        }

        if (/\b(hola|menu|menú|empezar|ayuda)\b/.test(textoMinusculas)) {
            await enviarMenuPrincipal(remitente);
            return;
        }

        if (textoMinusculas === 'cmd_horarios' || /\b(horario|horarios|clases|clase|turno)\b/.test(textoMinusculas)) {
            await enviarPlantillaHorarios(remitente);
            return;
        }

        if (textoMinusculas === 'cmd_reservar' || /\b(reservar|reserva)\b/.test(textoMinusculas)) {
            await setEstadoUsuario(remitente, 'ESPERANDO_FECHA');
            await enviarMensajeTexto(remitente, "¡Estaré encantado de gestionar tu reserva! 🍷\n\n📅 ¿Para qué fecha la necesitas? (Dime el día, ej: 25/10/2026)\n\n_(💡 Escribe *cancelar* en cualquier momento para salir)_");
            return;
        }

        if (textoMinusculas === 'cmd_ayuda_grupos') {
            await enviarMensajeTexto(remitente, "Para unirte a un grupo, solo tienes que decirme:\n\n*Quiero unirme al grupo de [Nombre del Curso]*\n\nTe pediré tu DNI por seguridad y te daré el enlace.");
            return;
        }

        await enviarMenuPrincipal(remitente);

      } 
    }
  } catch (error) { 
    console.error("Error general en el webhook:", error); 
  }
});

module.exports = router;