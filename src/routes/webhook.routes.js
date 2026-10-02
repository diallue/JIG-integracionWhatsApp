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

const {
  enviarMensajeTexto,
  enviarPlantillaHorarios,
  enviarEnlaceGrupo,
  enviarMenuPrincipal,
  enviarBotonesHora,
  suscribirAlumno,
  obtenerSuscriptores
} = require('../services/whatsapp.service');

const { enviarReservaAPI } = require('../services/reservas.service');

const PIN_ADMIN = process.env.PIN_ADMIN || 'LD2026';

function normalizarTexto(value, maxLength = 120) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

router.get('/', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
    return;
  }

  res.status(403).end();
});

router.post('/', async (req, res) => {
  res.status(200).end();

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry && body.entry[0] ? body.entry[0] : null;
      const changes = entry && entry.changes && entry.changes[0] ? entry.changes[0] : null;
      const value = changes ? changes.value : null;
      const field = changes ? changes.field : null;

      if (value && value.statuses) {
        const estado = value.statuses[0];
        if (estado && estado.errors) {
          console.error('-> FALLO ENTREGA:', JSON.stringify(estado.errors));
        }
        return;
      }

      if (field === 'messages' && value && value.messages && value.messages[0]) {
        const mensajeEntrante = value.messages[0];
        const remitente = mensajeEntrante.from;
        const nombrePerfil = value.contacts && value.contacts[0] && value.contacts[0].profile ? value.contacts[0].profile.name : 'Cliente';

        let textoOriginal = '';
        let textoMinusculas = '';

        if (mensajeEntrante.type === 'text') {
          textoOriginal = mensajeEntrante.text.body;
          textoMinusculas = textoOriginal.toLowerCase();
        } else if (mensajeEntrante.type === 'interactive') {
          textoOriginal = mensajeEntrante.interactive.button_reply && mensajeEntrante.interactive.button_reply.id ? mensajeEntrante.interactive.button_reply.id : mensajeEntrante.interactive.list_reply && mensajeEntrante.interactive.list_reply.id ? mensajeEntrante.interactive.list_reply.id : '';
          if (!textoOriginal) {
            return;
          }
          textoMinusculas = String(textoOriginal).toLowerCase();
        } else {
          return;
        }

        textoOriginal = normalizarTexto(textoOriginal, 500);
        textoMinusculas = normalizarTexto(textoMinusculas, 500);

        console.log('[MENSAJE RECIBIDO] De ' + remitente + ': "' + textoOriginal + '"');

        const estadoActual = await getEstadoUsuario(remitente);

        if (estadoActual) {
          if (textoMinusculas === 'cancelar') {
            await clearEstadoUsuario(remitente);
            await enviarMensajeTexto(remitente, 'Operacion cancelada. En que mas puedo ayudarte?');
            return;
          }

          if (estadoActual === 'ESPERANDO_DNI') {
            const identificador = normalizarTexto(textoOriginal, 30);
            const esValido = await validarAlumno(identificador);

            if (esValido) {
              const datos = await getDatosTemporales(remitente);
              const enlace = await obtenerEnlaceCurso(datos.curso_solicitado);

              await suscribirAlumno(datos.curso_solicitado, remitente);
              await enviarEnlaceGrupo(remitente, datos.curso_solicitado, enlace);
              await clearEstadoUsuario(remitente);
            } else {
              await enviarMensajeTexto(remitente, 'No encuentro ese DNI o numero de abonado en la lista de inscritos. Revisalo y vuelve a escribirlo, o escribe cancelar para salir.');
            }
            return;
          }

          if (estadoActual === 'ESPERANDO_FECHA') {
            await guardarDatoTemporal(remitente, 'fecha', normalizarTexto(textoOriginal, 30));
            await setEstadoUsuario(remitente, 'ESPERANDO_HORA');
            await enviarBotonesHora(remitente, normalizarTexto(textoOriginal, 30));
            return;
          }

          if (estadoActual === 'ESPERANDO_HORA') {
            const horaValue = normalizarTexto(textoOriginal, 20);
            await guardarDatoTemporal(remitente, 'hora', horaValue);
            await setEstadoUsuario(remitente, 'ESPERANDO_PLAZAS');
            await enviarMensajeTexto(remitente, 'Perfecto, a las ' + horaValue + '.\n\nCuantas personas vais a ser en total? (Dime un numero, ej: 4)\n\n_(?? Escribe cancelar en cualquier momento para salir)_');
            return;
          }

          if (estadoActual === 'ESPERANDO_PLAZAS') {
            await enviarMensajeTexto(remitente, 'Comprobando disponibilidad y procesando tu reserva...');

            const datos = await getDatosTemporales(remitente);
            datos.plazas = normalizarTexto(textoOriginal, 10);
            datos.nombre = nombrePerfil;

            const localizador = await enviarReservaAPI(remitente, datos);

            if (localizador) {
              await enviarMensajeTexto(remitente, 'Reserva confirmada con exito!\n\nLocalizador: *' + localizador + '*\nFecha: ' + datos.fecha + '\nHora: ' + datos.hora + '\nPlazas: ' + datos.plazas + '\n\nTe esperamos.');
            } else {
              await enviarMensajeTexto(remitente, 'Lo siento, no hay disponibilidad para esa fecha/hora o los datos son incorrectos. Por favor, intentalo de nuevo mas tarde.');
            }

            await clearEstadoUsuario(remitente);
            return;
          }
        }

        const regexAdmin = /^!nuevo\s+(\S+)\s+(.+?)\s+(https:\/\/chat\.whatsapp\.com\/\S+)$/i;
        const matchAdmin = textoOriginal.match(regexAdmin);

        if (matchAdmin) {
          const pinRecibido = normalizarTexto(matchAdmin[1], 20);
          const nombreCurso = normalizarTexto(matchAdmin[2], 80);
          const enlace = normalizarTexto(matchAdmin[3], 500);

          if (pinRecibido === PIN_ADMIN) {
            await guardarEnlaceCurso(nombreCurso, enlace);
            await enviarMensajeTexto(remitente, 'Exito! Enlace guardado correctamente para el curso: *' + nombreCurso + '*');
          } else {
            await enviarMensajeTexto(remitente, 'Acceso denegado: PIN de seguridad incorrecto.');
          }
          return;
        }

        const regexAviso = /^!aviso\s+(\S+)\s+["??](.+?)["??]\s+(.+)$/i;
        const matchAviso = textoOriginal.match(regexAviso);

        if (matchAviso) {
          const pinRecibido = normalizarTexto(matchAviso[1], 20);
          const nombreCurso = normalizarTexto(matchAviso[2], 80);
          const mensajeAviso = normalizarTexto(matchAviso[3], 500);

          if (pinRecibido === PIN_ADMIN) {
            const suscriptores = await obtenerSuscriptores(nombreCurso);

            if (suscriptores.length > 0) {
              await enviarMensajeTexto(remitente, 'Enviando aviso a ' + suscriptores.length + ' alumnos de *' + nombreCurso + '*...');

              let enviados = 0;
              for (const telefonoAlumno of suscriptores) {
                await enviarMensajeTexto(telefonoAlumno, 'AVISO DE LOGRONO DEPORTE\nCurso: ' + nombreCurso + '\n\n' + mensajeAviso);
                enviados += 1;
              }
              await enviarMensajeTexto(remitente, 'Aviso enviado con exito a ' + enviados + ' alumnos!');
            } else {
              await enviarMensajeTexto(remitente, 'No hay ningun alumno validado en el curso de *' + nombreCurso + '*.');
            }
          } else {
            await enviarMensajeTexto(remitente, 'Acceso denegado: PIN de seguridad incorrecto.');
          }
          return;
        }

        const regexUsuario = /^quiero unirme al grupo de (.+)$/i;
        const matchUsuario = textoMinusculas.match(regexUsuario);

        if (matchUsuario) {
          const nombreCursoSolicitado = normalizarTexto(matchUsuario[1], 80);
          const enlaceEncontrado = await obtenerEnlaceCurso(nombreCursoSolicitado);

          if (enlaceEncontrado) {
            await guardarDatoTemporal(remitente, 'curso_solicitado', nombreCursoSolicitado);
            await setEstadoUsuario(remitente, 'ESPERANDO_DNI');
            await enviarMensajeTexto(remitente, 'Tengo el enlace para el grupo de *' + nombreCursoSolicitado + '*.\n\nPor seguridad, indicame primero tu DNI o numero de abonado para verificar tu inscripcion.\n\n_(?? Escribe cancelar en cualquier momento para salir)_');
          } else {
            await enviarMensajeTexto(remitente, 'Lo siento, todavia no tengo registrado un grupo para el curso de *' + nombreCursoSolicitado + '*. Consulta con Logrono Deporte o tu monitor.');
          }
          return;
        }

        if (/\b(hola|menu|empezar|ayuda)\b/.test(textoMinusculas)) {
          await enviarMenuPrincipal(remitente);
          return;
        }

        if (textoMinusculas === 'cmd_horarios' || /\b(horario|horarios|clases|clase|turno|hoy|manana|semana)\b/.test(textoMinusculas)) {
          await enviarPlantillaHorarios(remitente);
          return;
        }

        if (textoMinusculas === 'cmd_reservar' || /\b(reservar|reserva)\b/.test(textoMinusculas)) {
          await setEstadoUsuario(remitente, 'ESPERANDO_FECHA');
          await enviarMensajeTexto(remitente, 'Estare encantado de gestionar tu reserva! ??\n\nFecha? (Dime el dia, ej: 25/10/2026)\n\n_(?? Escribe cancelar en cualquier momento para salir)_');
          return;
        }

        if (textoMinusculas === 'cmd_ayuda_grupos') {
          await enviarMensajeTexto(remitente, 'Para unirte a un grupo, solo tienes que decirme:\n\n*Quiero unirme al grupo de [Nombre del Curso]*\n\nTe pedire tu DNI por seguridad y te dare el enlace.');
          return;
        }

        if (textoMinusculas === 'cmd_faqs') {
          await enviarMensajeTexto(remitente, 'PREGUNTAS FRECUENTES\n\n1. Como me abono?\nPuedes abonarte online en nuestra web o presencialmente en Las Gaunas.\n\n2. Que incluye la tarifa?\nAcceso libre a piscinas, pistas de atletismo y descuentos en reservas.\n\n3. Puedo cancelar una reserva?\nSi, hasta 24 horas antes desde tu area de usuario en la web.\n\nMas detalles: https://www.logronodeporte.es');
          return;
        }

        await enviarMenuPrincipal(remitente);
      }
    }
  } catch (error) {
    console.error('Error general en el webhook:', error);
  }
});

module.exports = router;
