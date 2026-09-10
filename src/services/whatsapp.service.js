const whatsappToken = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

async function enviarMensajeTexto(destinatario, texto) {
  const url = `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: destinatario,
    type: "text",
    text: { 
      preview_url: true,
      body: texto 
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log("[AUTOMATIZACIÓN ENVIADA]:", result);
  } catch (error) {
    console.error("[ERROR HTTP]:", error);
  }
}

async function enviarPlantillaHorarios(destinatario) {
  const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: destinatario,
    type: "text",
    text: { 
      preview_url: true, 
      body: "Puedes consultar todos tus horarios del curso Bodypump 2026-2027 en el siguiente enlace:\nhttps://www.logronodeporte.es/horarios" 
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data.error, null, 2));
  }

  return data;
}

async function crearGrupoCurso(nombreCurso) {
  const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/groups`;
  const payload = {
    messaging_product: "whatsapp",
    subject: `Logroño Deporte - ${nombreCurso}`,
    description: `Grupo oficial de coordinación para el curso de ${nombreCurso}.`
  };
  const response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return await response.json();
}
module.exports = { enviarPlantillaHorarios, crearGrupoCurso };
