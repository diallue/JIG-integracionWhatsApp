const whatsappToken = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;
const suscripcionesCursos = new Map();

async function enviarMensajeTexto(destinatario, texto) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: destinatario,
    type: "text",
    text: { preview_url: true, body: texto }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${whatsappToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(JSON.stringify(errorData));
  }
  return response.json();
}

async function enviarPlantillaHorarios(destinatario) {
  const texto = "Puedes consultar todos tus horarios del curso 2026-2027 en el siguiente enlace:\nhttps://www.logronodeporte.es/horarios";
  return enviarMensajeTexto(destinatario, texto);
}

async function enviarEnlaceGrupo(destinatario, nombreCurso, enlaceGrupo) {
  const texto = `¡Hola! Aquí tienes el acceso al grupo oficial de coordinación para *${nombreCurso}*:\n\n👉 ${enlaceGrupo}\n\nÚnete para estar al tanto de todas las novedades de Logroño Deporte.`;
  return enviarMensajeTexto(destinatario, texto);
}

async function enviarMenuPrincipal(destinatario) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: destinatario,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: "¡Hola! Soy el asistente virtual de Logroño Deporte 🏃‍♂️\n\n¿En qué te puedo ayudar hoy?"
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: { id: "cmd_horarios", title: "📅 Horarios" }
          },
          {
            type: "reply",
            reply: { id: "cmd_reservar", title: "🍷 Reservar" }
          },
          {
            type: "reply",
            reply: { id: "cmd_ayuda_grupos", title: "📱 Grupos WhatsApp" }
          }
        ]
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${whatsappToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return response.json();
}

async function enviarBotonesHora(destinatario, fecha) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: destinatario,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: `📅 ¡Anotado! Fecha: *${fecha}*.\n\n¿En qué turno te gustaría reservar?\n\n_(💡 Selecciona una opción o escribe cancelar)_`
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: { id: "10:00", title: "🌅 Mañana (10:00)" }
          },
          {
            type: "reply",
            reply: { id: "15:00", title: "☀️ Tarde (15:00)" }
          },
          {
            type: "reply",
            reply: { id: "19:00", title: "🌙 Noche (19:00)" }
          }
        ]
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${whatsappToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return response.json();
}

async function suscribirAlumno(nombreCurso, telefono) {
   const clave = nombreCurso.toLowerCase().trim();
   if (!suscripcionesCursos.has(clave)) {
       suscripcionesCursos.set(clave, new Set());
   }
   suscripcionesCursos.get(clave).add(telefono);
   console.log(`[DB] Alumno ${telefono} suscrito a avisos de: ${clave}`);
}

async function obtenerSuscriptores(nombreCurso) {
   const clave = nombreCurso.toLowerCase().trim();
   const suscriptores = suscripcionesCursos.get(clave);
   return suscriptores ? Array.from(suscriptores) : [];
}

module.exports = {
  enviarMensajeTexto,
  enviarPlantillaHorarios,
  enviarEnlaceGrupo,
  enviarMenuPrincipal,
  enviarBotonesHora,
  suscribirAlumno,
  obtenerSuscriptores
};