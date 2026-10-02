const whatsappToken = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;
const suscripcionesCursos = new Map();

function validarConfiguracionWhatsApp() {
  if (!whatsappToken || !phoneNumberId) {
    throw new Error('Faltan WHATSAPP_TOKEN o PHONE_NUMBER_ID en el entorno.');
  }
}

function getHeaders() {
  validarConfiguracionWhatsApp();
  return {
    Authorization: 'Bearer ' + whatsappToken,
    'Content-Type': 'application/json'
  };
}

async function enviarMensajeTexto(destinatario, texto) {
  const url = 'https://graph.facebook.com/v21.0/' + phoneNumberId + '/messages';
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: destinatario,
    type: 'text',
    text: { preview_url: true, body: texto }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }

  return response.json();
}

async function enviarPlantillaHorarios(destinatario) {
  const texto = 'Puedes consultar todos tus horarios del curso 2026-2027 en el siguiente enlace:\nhttps://www.logronodeporte.es/horarios';
  return enviarMensajeTexto(destinatario, texto);
}

async function enviarEnlaceGrupo(destinatario, nombreCurso, enlaceGrupo) {
  const texto = 'Hola! Aqui tienes el acceso al grupo oficial de coordinacion para *' + nombreCurso + '*:\n\nEnlace: ' + enlaceGrupo + '\n\nUnete para estar al tanto de todas las novedades de Logrono Deporte.';
  return enviarMensajeTexto(destinatario, texto);
}

async function enviarMenuPrincipal(destinatario) {
  const url = 'https://graph.facebook.com/v20.0/' + phoneNumberId + '/messages';

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: destinatario,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: 'Logrono Deporte'
      },
      body: {
        text: 'Hola! Soy tu asistente virtual.\n\nDespliega el menu de abajo y selecciona la opcion en la que te puedo ayudar hoy:'
      },
      footer: {
        text: 'Atencion automatizada 24/7'
      },
      action: {
        button: 'Ver opciones',
        sections: [
          {
            title: 'Gestiones Rapidas',
            rows: [
              { id: 'cmd_reservar', title: 'Reservar espacio', description: 'Inicia una nueva reserva paso a paso' },
              { id: 'cmd_horarios', title: 'Ver Horarios', description: 'Consulta los horarios de los cursos' }
            ]
          },
          {
            title: 'Alumnos e Informacion',
            rows: [
              { id: 'cmd_ayuda_grupos', title: 'Grupos WhatsApp', description: 'Unete al chat de tu curso' },
              { id: 'cmd_faqs', title: 'Preguntas Frecuentes', description: 'Tarifas, normas y dudas comunes' }
            ]
          }
        ]
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  return response.json();
}

async function enviarBotonesHora(destinatario, fecha) {
  const url = 'https://graph.facebook.com/v21.0/' + phoneNumberId + '/messages';

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: destinatario,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: 'Anotado! Fecha: *' + fecha + '*.\n\nEn que turno te gustaria reservar?\n\n_(?? Selecciona una opcion o escribe cancelar)_' 
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: '10:00', title: 'Manana (10:00)' } },
          { type: 'reply', reply: { id: '15:00', title: 'Tarde (15:00)' } },
          { type: 'reply', reply: { id: '19:00', title: 'Noche (19:00)' } }
        ]
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  return response.json();
}

async function suscribirAlumno(nombreCurso, telefono) {
  const clave = String(nombreCurso || '').trim().toLowerCase();

  if (!suscripcionesCursos.has(clave)) {
    suscripcionesCursos.set(clave, new Set());
  }

  suscripcionesCursos.get(clave).add(telefono);
  console.log('[DB] Alumno ' + telefono + ' suscrito a avisos de: ' + clave);
}

async function obtenerSuscriptores(nombreCurso) {
  const clave = String(nombreCurso || '').trim().toLowerCase();
  const suscriptores = suscripcionesCursos.get(clave);
  return suscriptores ? Array.from(suscriptores) : [];
}

async function crearGrupo(nombreCurso) {
  const url = 'https://graph.facebook.com/v21.0/' + phoneNumberId + '/groups';

  const payload = {
    messaging_product: 'whatsapp',
    subject: nombreCurso
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('-> Error de Meta al crear grupo:', JSON.stringify(errorData));
    return null;
  }

  const data = await response.json();
  return data;
}

module.exports = {
  enviarMensajeTexto,
  enviarPlantillaHorarios,
  enviarEnlaceGrupo,
  enviarMenuPrincipal,
  enviarBotonesHora,
  suscribirAlumno,
  obtenerSuscriptores,
  crearGrupo
};
