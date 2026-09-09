const whatsappToken = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

async function enviarPlantillaHorarios(destinatario) {
  const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: destinatario,
    type: "template",
    template: { name: "respuesta_horarios", language: { code: "es" } }
  };
  await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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