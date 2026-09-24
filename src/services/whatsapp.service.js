const whatsappToken = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

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
  const texto = `¡Hola! Aquí tienes el acceso al grupo oficial de coordinación para *${nombreCurso}*:\n\n👉 ${enlaceGrupo}\n\nÚnete para estar al tanto de todas las 
                 novedades de Logroño Deporte.`;
  return enviarMensajeTexto(destinatario, texto);
}

module.exports = {
  enviarMensajeTexto,
  enviarPlantillaHorarios,
  enviarEnlaceGrupo
};